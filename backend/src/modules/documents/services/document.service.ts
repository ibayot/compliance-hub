import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from './storage.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  DocumentAssignment,
  SubmissionFrequency,
} from '../entities/document-assignment.entity';
import { UserRole } from '../../users/entities/user.entity';
import { ManualReview, ReviewDecision } from '../../reviews/entities/manual-review.entity';
import { DocumentReference } from '../entities/document-reference.entity';
import * as mammoth from 'mammoth';
import { ReportorialDocumentType } from '../entities/reportorial-document-type.entity';
import { ReportorialDocTypeService } from './reportorial-doc-type.service';

export interface UploadDocumentDto {
  title: string;
  document_type: string;
  period: string;
  year: string;
  unit_id: number;
  uploaded_by: number;
  user_role: UserRole;
  file: Express.Multer.File;
  /** Optional: link to a ReportorialDocumentType record */
  reportorial_doc_type_id?: number;
}

export interface ListDocumentsDto {
  title?: string;
  unit_id?: string;
  document_type?: string;
  period?: string;
  year?: string;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
  actor_role?: UserRole;
  actor_id?: number;
  /** When true, return soft-deleted (archived) documents owned by actor_id (focal only) */
  archived?: boolean;
}

@Injectable()
export class DocumentService implements OnModuleInit {
  private readonly logger = new Logger(DocumentService.name);

  private async extractInitialText(file: Express.Multer.File): Promise<string> {
    if (file.originalname.toLowerCase().endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value || '';
      } catch {
        return '';
      }
    }

    return '';
  }

  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentAssignment)
    private assignmentRepo: Repository<DocumentAssignment>,
    @InjectRepository(ManualReview)
    private reviewRepo: Repository<ManualReview>,
    @InjectRepository(DocumentReference)
    private referenceRepo: Repository<DocumentReference>,
    @InjectRepository(ReportorialDocumentType)
    private reportorialDocTypeRepo: Repository<ReportorialDocumentType>,
    private storageService: StorageService,
    @InjectQueue('document-processing') private documentQueue: Queue,
    private dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS document_assignments (
        id varchar(36) NOT NULL,
        user_id int NOT NULL,
        unit_id int NOT NULL,
        document_type varchar(100) NOT NULL,
        report_name varchar(255) DEFAULT NULL,
        filename_prefix varchar(100) DEFAULT NULL,
        submission_frequency enum('monthly','quarterly','annual','custom') NOT NULL DEFAULT 'monthly',
        submission_month tinyint DEFAULT NULL,
        is_active tinyint(1) NOT NULL DEFAULT 1,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_assignment_user_unit_type (user_id, unit_id, document_type),
        KEY idx_assignment_user (user_id),
        KEY idx_assignment_unit (unit_id),
        CONSTRAINT fk_assignment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_assignment_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS document_references (
        id varchar(36) NOT NULL,
        source_document_id varchar(36) NOT NULL,
        target_document_id varchar(36) NOT NULL,
        relationship_type varchar(50) NOT NULL DEFAULT 'references',
        created_by int DEFAULT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_document_reference_pair (source_document_id, target_document_id),
        KEY idx_doc_ref_source (source_document_id),
        KEY idx_doc_ref_target (target_document_id),
        CONSTRAINT fk_doc_ref_source FOREIGN KEY (source_document_id) REFERENCES documents (id) ON DELETE CASCADE,
        CONSTRAINT fk_doc_ref_target FOREIGN KEY (target_document_id) REFERENCES documents (id) ON DELETE CASCADE,
        CONSTRAINT fk_doc_ref_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.dataSource.query(`
      ALTER TABLE document_versions
      ADD COLUMN IF NOT EXISTS file_blob LONGBLOB NULL,
      ADD COLUMN IF NOT EXISTS preview_blob LONGBLOB NULL;
    `);

    await this.dataSource.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS file_blob LONGBLOB NULL;
    `);
  }

  private async getLatestReviewMap(
    documentIds: string[],
  ): Promise<Map<string, { decision: ReviewDecision | 'pending'; remarks: string | null }>> {
    if (documentIds.length === 0) {
      return new Map();
    }

    const reviews = await this.reviewRepo
      .createQueryBuilder('review')
      .where('review.document_id IN (:...documentIds)', { documentIds })
      .orderBy('review.document_id', 'ASC')
      .addOrderBy('review.reviewed_at', 'DESC')
      .getMany();

    const latestMap = new Map<string, { decision: ReviewDecision | 'pending'; remarks: string | null }>();
    for (const review of reviews) {
      if (!latestMap.has(review.document_id)) {
        latestMap.set(review.document_id, { decision: review.decision, remarks: review.remarks ?? null });
      }
    }

    for (const documentId of documentIds) {
      if (!latestMap.has(documentId)) {
        latestMap.set(documentId, { decision: 'pending', remarks: null });
      }
    }

    return latestMap;
  }

  /** @deprecated use getLatestReviewMap instead */
  private async getLatestReviewDecisionMap(
    documentIds: string[],
  ): Promise<Map<string, ReviewDecision | 'pending'>> {
    const full = await this.getLatestReviewMap(documentIds);
    const out = new Map<string, ReviewDecision | 'pending'>();
    full.forEach((v, k) => out.set(k, v.decision));
    return out;
  }

  private async getReferenceCountMap(documentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (documentIds.length === 0) {
      return map;
    }

    const outgoing = await this.referenceRepo
      .createQueryBuilder('ref')
      .select('ref.source_document_id', 'document_id')
      .addSelect('COUNT(*)', 'count')
      .where('ref.source_document_id IN (:...documentIds)', { documentIds })
      .groupBy('ref.source_document_id')
      .getRawMany<{ document_id: string; count: string }>();

    const incoming = await this.referenceRepo
      .createQueryBuilder('ref')
      .select('ref.target_document_id', 'document_id')
      .addSelect('COUNT(*)', 'count')
      .where('ref.target_document_id IN (:...documentIds)', { documentIds })
      .groupBy('ref.target_document_id')
      .getRawMany<{ document_id: string; count: string }>();

    for (const row of [...outgoing, ...incoming]) {
      map.set(row.document_id, (map.get(row.document_id) || 0) + Number(row.count || 0));
    }

    return map;
  }

  private async enrichDocumentsForWorkflow(documents: Document[]): Promise<Document[]> {
    const documentIds = documents.map((document) => document.id);
    const [reviewMap, referenceCountMap] = await Promise.all([
      this.getLatestReviewMap(documentIds),
      this.getReferenceCountMap(documentIds),
    ]);

    return documents.map((document) => {
      const latestReview = reviewMap.get(document.id) || { decision: 'pending', remarks: null };
      const issuanceLinks = Array.isArray((document as any).issuances)
        ? (document as any).issuances.length
        : 0;
      const documentLinks = referenceCountMap.get(document.id) || 0;
      const linkCount = issuanceLinks + documentLinks;

      return {
        ...document,
        compliance_status: latestReview.decision,
        latest_review_remarks: latestReview.remarks,
        is_linked: linkCount > 0,
        linked_count: linkCount,
      } as Document;
    });
  }

  private normalizeDocumentType(documentType: string): string {
    return documentType.trim().replace(/\s+/g, ' ');
  }

  private getMonthlySuffix(period: string, year: string): string {
    const monthlyWithYear = /^(\d{4})-(\d{1,2})$/.exec(period.trim());
    if (monthlyWithYear) {
      return `${monthlyWithYear[1]}${monthlyWithYear[2].padStart(2, '0')}`;
    }

    const monthOnly = /^(\d{1,2})$/.exec(period.trim());
    if (monthOnly) {
      return `${year}${monthOnly[1].padStart(2, '0')}`;
    }

    throw new BadRequestException('Monthly reports require period format MM or YYYY-MM');
  }

  private getQuarterlySuffix(period: string, year: string): string {
    const withYear = /^(\d{4})-?Q([1-4])$/i.exec(period.trim());
    if (withYear) {
      return `${withYear[1]}Q${withYear[2]}`;
    }

    const quarterOnly = /^Q([1-4])$/i.exec(period.trim());
    if (quarterOnly) {
      return `${year}Q${quarterOnly[1]}`;
    }

    throw new BadRequestException('Quarterly reports require period format Q1..Q4 or YYYY-Q1..Q4');
  }

  private getAnnualSuffix(year: string): string {
    if (!/^\d{4}$/.test(year)) {
      throw new BadRequestException('Annual reports require a 4-digit year');
    }

    return year;
  }

  private buildExpectedFileBase(
    assignment: DocumentAssignment,
    period: string,
    year: string,
  ): string {
    const prefix = (assignment.filename_prefix || '').trim().toUpperCase();
    if (!prefix) {
      return '';
    }

    switch (assignment.submission_frequency) {
      case SubmissionFrequency.MONTHLY:
        return `${prefix}${this.getMonthlySuffix(period, year)}`;
      case SubmissionFrequency.QUARTERLY:
        return `${prefix}${this.getQuarterlySuffix(period, year)}`;
      case SubmissionFrequency.ANNUAL:
        return `${prefix}${this.getAnnualSuffix(year)}`;
      case SubmissionFrequency.CUSTOM:
      default:
        return `${prefix}${year}${period.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
    }
  }

  private async validateFocalSubmission(
    dto: UploadDocumentDto,
    fileName: string,
  ): Promise<void> {
    const normalizedType = this.normalizeDocumentType(dto.document_type);

    const assignment = await this.assignmentRepo.findOne({
      where: {
        user_id: dto.uploaded_by,
        unit_id: Number(dto.unit_id),
        document_type: normalizedType,
        is_active: true,
      },
    });

    if (!assignment) {
      throw new BadRequestException(
        'No active assignment found for this focal user and document type.',
      );
    }

    const existingSubmission = await this.documentRepo.findOne({
      where: {
        unit_id: Number(dto.unit_id),
        document_type: normalizedType,
        period: dto.period,
        year: dto.year,
        uploaded_by: dto.uploaded_by,
        is_deleted: false,
      },
    });

    if (existingSubmission) {
      // Allow re-upload if the document was returned for revision
      const latestReview = await this.reviewRepo.findOne({
        where: { document_id: existingSubmission.id },
        order: { reviewed_at: 'DESC' },
      });

      if (
        latestReview?.decision === ReviewDecision.NEEDS_REVISION ||
        latestReview?.decision === ReviewDecision.NON_COMPLIANT
      ) {
        // Soft-delete the returned document so re-upload can proceed
        await this.documentRepo.update(existingSubmission.id, { is_deleted: true });
      } else {
        throw new ConflictException(
          'This report type was already submitted for the selected cycle.',
        );
      }
    }

    const expectedBase = this.buildExpectedFileBase(
      assignment,
      dto.period,
      dto.year,
    );

    if (expectedBase) {
      const uploadedBase = fileName.replace(/\.(docx|pdf)$/i, '').toUpperCase();
      if (uploadedBase !== expectedBase) {
        throw new BadRequestException(
          `Invalid file name. Expected ${expectedBase}.docx or ${expectedBase}.pdf`,
        );
      }
    }
  }

  /**
   * Upload a new document
   */
  async uploadDocument(dto: UploadDocumentDto): Promise<Document> {
    const { file, ...metadata } = dto;
    const { user_role, ...persistedMetadata } = metadata;

    // Validate file type
    const isDocx = file.originalname.toLowerCase().endsWith('.docx');
    const isPdf = file.originalname.toLowerCase().endsWith('.pdf');
    if (!isDocx && !isPdf) {
      throw new BadRequestException('Only DOCX and PDF files are allowed');
    }

    const normalizedDocumentType = this.normalizeDocumentType(metadata.document_type);

    if (user_role === UserRole.FOCAL && !metadata.reportorial_doc_type_id) {
      await this.validateFocalSubmission(
        { ...metadata, document_type: normalizedDocumentType, file },
        file.originalname,
      );
    }

    // Validate via reportorial document type (new system)
    let reportorialDocType: ReportorialDocumentType | null = null;
    let finalDocumentType = normalizedDocumentType;
    let finalPeriod = metadata.period || '';
    let finalYear = metadata.year || String(new Date().getFullYear());

    if (metadata.reportorial_doc_type_id) {
      reportorialDocType = await this.reportorialDocTypeRepo.findOne({
        where: { id: Number(metadata.reportorial_doc_type_id) },
      });
      if (!reportorialDocType) {
        throw new BadRequestException('Invalid reportorial document type ID');
      }

      // Use client-supplied year/period (late submission support); fall back to current date
      let expectedFilename: string;
      if (metadata.year && (metadata.period || reportorialDocType.submission_frequency === 'annual')) {
        expectedFilename = ReportorialDocTypeService.computeExpectedFilenameFromParts(
          reportorialDocType,
          metadata.year,
          metadata.period || '',
        );
      } else {
        expectedFilename = ReportorialDocTypeService.computeExpectedFilename(reportorialDocType);
      }

      const uploadedBase = file.originalname.replace(/\.(docx|pdf)$/i, '');
      if (uploadedBase !== expectedFilename) {
        throw new BadRequestException(
          `Invalid filename. Expected "${expectedFilename}.docx" or "${expectedFilename}.pdf" based on the document type and selected period.`,
        );
      }
      finalDocumentType = reportorialDocType.display_name;
      // Compute the canonical period suffix using the same parts
      const suffix = (metadata.year && (metadata.period || reportorialDocType.submission_frequency === 'annual'))
        ? ReportorialDocTypeService.computePeriodSuffixFromParts(
            reportorialDocType.submission_frequency,
            metadata.year,
            metadata.period || '',
          )
        : ReportorialDocTypeService.computePeriodSuffix(reportorialDocType.submission_frequency);
      finalPeriod = suffix;
      finalYear = metadata.year || String(new Date().getFullYear());
    }

    // For focal users on the reportorial path, check for duplicate submissions
    if (dto.user_role === UserRole.FOCAL && metadata.reportorial_doc_type_id) {
      const existingReportorial = await this.documentRepo.findOne({
        where: {
          unit_id: Number(dto.unit_id),
          reportorial_doc_type_id: Number(metadata.reportorial_doc_type_id),
          period: finalPeriod || metadata.period,
          year: finalYear || metadata.year,
          uploaded_by: metadata.uploaded_by,
          is_deleted: false,
        },
      });

      if (existingReportorial) {
        const latestReview = await this.reviewRepo.findOne({
          where: { document_id: existingReportorial.id },
          order: { reviewed_at: 'DESC' },
        });

        if (
          latestReview?.decision === ReviewDecision.NEEDS_REVISION ||
          latestReview?.decision === ReviewDecision.NON_COMPLIANT
        ) {
          // Soft-delete the returned document so re-upload can proceed
          await this.documentRepo.update(existingReportorial.id, { is_deleted: true });
        } else {
          throw new ConflictException(
            'This report type was already submitted for the selected cycle.',
          );
        }
      }
    }

    // Calculate checksum
    const checksum = this.storageService.calculateChecksum(file.buffer);

    // Save file to storage
    const filePath = await this.storageService.saveFile(
      file.buffer,
      file.originalname,
      'documents',
    );

    // Create document entity — use the display name as the title for reportorial uploads
    const finalTitle = metadata.reportorial_doc_type_id && reportorialDocType
      ? reportorialDocType.display_name
      : persistedMetadata.title;

    const extractedText = await this.extractInitialText(file);
    const document: Document = this.documentRepo.create({
      ...persistedMetadata,
      title: finalTitle,
      document_type: finalDocumentType,
      period: finalPeriod || persistedMetadata.period,
      year: finalYear || persistedMetadata.year,
      reportorial_doc_type_id: metadata.reportorial_doc_type_id ? Number(metadata.reportorial_doc_type_id) : null,
      status: DocumentStatus.PENDING,
      current_version: 1,
      extracted_text: extractedText,
      file_blob: file.buffer,
    } as any) as unknown as Document;
    await this.documentRepo.save(document);

    // Create version entity
    const version = await this.versionRepo.save({
      document_id: document.id,
      version_number: 1,
      file_name: file.originalname,
      file_path: filePath,
      file_blob: file.buffer,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum,
      preview_path: isPdf ? filePath : null,
      preview_blob: isPdf ? file.buffer : null,
      extracted_text: extractedText,
      uploaded_by: metadata.uploaded_by,
    } as any);

    // Queue document processing job
    void this.documentQueue
      .add('process-document', {
        documentId: document.id,
        versionId: version.id,
      })
      .catch((error) => {
        this.logger.warn(
          `Background processing queue unavailable for document ${document.id}: ${error?.message || 'unknown error'}`,
        );
      });

    this.logger.log(`Document uploaded: ${document.id}`);

    return document;
  }

  /**
   * Get document by ID with relations
   */
  async getDocumentById(id: string): Promise<Document> {
    // Allow fetching archived (is_deleted=true) docs so focal can view detail on archived page
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: ['unit', 'uploader', 'versions', 'versions.uploader', 'issuances'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const [enriched] = await this.enrichDocumentsForWorkflow([document]);
    return enriched;
  }

  /**
   * List documents with filters and pagination
   */
  async listDocuments(dto: ListDocumentsDto): Promise<{
    data: Document[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      title,
      unit_id,
      document_type,
      period,
      year,
      status,
      page = 1,
      limit = 20,
      actor_role,
      actor_id,
      archived = false,
    } = dto;

    const query = this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.unit', 'unit')
      .leftJoinAndSelect('doc.uploader', 'uploader')
      .leftJoinAndSelect('doc.issuances', 'issuances')
      // archived mode shows soft-deleted docs for the owning focal; normal mode shows active docs
      .where('doc.is_deleted = :isDeleted', { isDeleted: archived ? true : false });

    if (unit_id) {
      query.andWhere('doc.unit_id = :unit_id', { unit_id });
    }
    if (title) {
      query.andWhere('doc.title LIKE :title', { title: `%${title}%` });
    }
    if (document_type) {
      query.andWhere('doc.document_type = :document_type', { document_type });
    }
    if (period) {
      query.andWhere('doc.period = :period', { period });
    }
    if (year) {
      query.andWhere('doc.year = :year', { year });
    }
    if (status) {
      query.andWhere('doc.status = :status', { status });
    }

    if (actor_role === UserRole.FOCAL && actor_id) {
      query.andWhere('doc.uploaded_by = :actorId', { actorId: actor_id });
    }

    // Admin/reviewer list excludes already-resolved documents (compliant, returned) so only
    // pending submissions needing attention appear. Explicit status filters bypass this.
    if (
      !archived &&
      !status &&
      (actor_role === UserRole.SUPER_ADMIN || actor_role === UserRole.REVIEWER)
    ) {
      query.andWhere(`
        COALESCE((
          SELECT mr.decision
          FROM manual_reviews mr
          WHERE mr.document_id = doc.id
          ORDER BY mr.reviewed_at DESC
          LIMIT 1
        ), 'pending') NOT IN ('compliant', 'needs_revision', 'non_compliant')
      `);
    }

    query.orderBy('doc.created_at', 'DESC');
    query.distinct(true);
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();
    const enriched = await this.enrichDocumentsForWorkflow(data);

    return { data: enriched, total, page, limit };
  }

  async listDocumentReferences(documentId: string): Promise<{
    outgoing: DocumentReference[];
    incoming: DocumentReference[];
  }> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const [outgoing, incoming] = await Promise.all([
      this.referenceRepo.find({
        where: { source_document_id: documentId },
        relations: ['target_document'],
        order: { created_at: 'DESC' },
      }),
      this.referenceRepo.find({
        where: { target_document_id: documentId },
        relations: ['source_document'],
        order: { created_at: 'DESC' },
      }),
    ]);

    return { outgoing, incoming };
  }

  async linkDocumentReference(payload: {
    source_document_id: string;
    target_document_id: string;
    created_by?: number;
    relationship_type?: string;
  }): Promise<DocumentReference> {
    if (payload.source_document_id === payload.target_document_id) {
      throw new BadRequestException('A document cannot reference itself.');
    }

    const [sourceDocument, targetDocument] = await Promise.all([
      this.documentRepo.findOne({ where: { id: payload.source_document_id, is_deleted: false } }),
      this.documentRepo.findOne({ where: { id: payload.target_document_id, is_deleted: false } }),
    ]);

    if (!sourceDocument || !targetDocument) {
      throw new NotFoundException('Source or target document not found');
    }

    if (
      sourceDocument.status !== DocumentStatus.READY ||
      targetDocument.status !== DocumentStatus.READY
    ) {
      throw new BadRequestException('Only ready/compliant documents can be linked.');
    }

    const existing = await this.referenceRepo.findOne({
      where: {
        source_document_id: payload.source_document_id,
        target_document_id: payload.target_document_id,
      },
    });

    if (existing) {
      throw new ConflictException('Document reference already exists.');
    }

    const reference = this.referenceRepo.create({
      source_document_id: payload.source_document_id,
      target_document_id: payload.target_document_id,
      relationship_type: payload.relationship_type?.trim() || 'references',
      created_by: payload.created_by || null,
    });

    return this.referenceRepo.save(reference);
  }

  async unlinkDocumentReference(
    sourceDocumentId: string,
    targetDocumentId: string,
  ): Promise<void> {
    const result = await this.referenceRepo.delete({
      source_document_id: sourceDocumentId,
      target_document_id: targetDocumentId,
    });

    if (!result.affected) {
      throw new NotFoundException('Document reference not found');
    }
  }

  async listDocumentTypes(): Promise<string[]> {
    const defaults = ['Policy', 'Procedure', 'Guidelines', 'Manual', 'Report', 'Other'];
    const rows = await this.documentRepo
      .createQueryBuilder('doc')
      .select('DISTINCT doc.document_type', 'document_type')
      .where('doc.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('doc.document_type', 'ASC')
      .getRawMany<{ document_type: string }>();

    const discovered = rows
      .map((row) => row.document_type)
      .filter(Boolean);

    return Array.from(new Set([...defaults, ...discovered]));
  }

  async createAssignment(payload: {
    user_id: number;
    unit_id: number;
    document_type: string;
    report_name?: string;
    filename_prefix?: string;
    submission_frequency?: SubmissionFrequency;
    submission_month?: number;
    is_active?: boolean;
  }): Promise<DocumentAssignment> {
    const documentType = this.normalizeDocumentType(payload.document_type);

    const existing = await this.assignmentRepo.findOne({
      where: {
        user_id: payload.user_id,
        unit_id: payload.unit_id,
        document_type: documentType,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Assignment already exists for this focal user, unit, and document type.',
      );
    }

    const assignment = this.assignmentRepo.create({
      ...payload,
      document_type: documentType,
      filename_prefix: payload.filename_prefix?.trim().toUpperCase(),
    });

    return this.assignmentRepo.save(assignment);
  }

  async listAssignments(filters?: {
    user_id?: number;
    unit_id?: number;
    active_only?: boolean;
  }): Promise<DocumentAssignment[]> {
    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.unit', 'unit');

    if (filters?.user_id) {
      qb.andWhere('assignment.user_id = :userId', { userId: filters.user_id });
    }

    if (filters?.unit_id) {
      qb.andWhere('assignment.unit_id = :unitId', { unitId: filters.unit_id });
    }

    if (filters?.active_only) {
      qb.andWhere('assignment.is_active = :active', { active: true });
    }

    qb.orderBy('assignment.created_at', 'DESC');

    return qb.getMany();
  }

  async updateAssignment(
    id: string,
    payload: Partial<{
      unit_id: number;
      document_type: string;
      report_name?: string;
      filename_prefix?: string;
      submission_frequency?: SubmissionFrequency;
      submission_month?: number;
      is_active?: boolean;
    }>,
  ): Promise<DocumentAssignment> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (payload.document_type) {
      payload.document_type = this.normalizeDocumentType(payload.document_type);
    }

    if (payload.filename_prefix !== undefined) {
      payload.filename_prefix = payload.filename_prefix?.trim().toUpperCase();
    }

    Object.assign(assignment, payload);
    await this.assignmentRepo.save(assignment);

    return this.assignmentRepo.findOne({
      where: { id },
      relations: ['user', 'unit'],
    }) as Promise<DocumentAssignment>;
  }

  async deleteAssignment(id: string): Promise<void> {
    const result = await this.assignmentRepo.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Assignment not found');
    }
  }

  async getAvailableUploadOptions(
    userId: number,
    period: string,
    year: string,
  ): Promise<
    Array<{
      assignment_id: string;
      unit_id: number;
      unit_name?: string;
      document_type: string;
      report_name?: string;
      submission_frequency: SubmissionFrequency;
      expected_file_name?: string;
    }>
  > {
    const assignments = await this.assignmentRepo.find({
      where: { user_id: userId, is_active: true },
      relations: ['unit'],
      order: { created_at: 'DESC' },
    });

    if (assignments.length === 0) {
      return [];
    }

    const options: Array<{
      assignment_id: string;
      unit_id: number;
      unit_name?: string;
      document_type: string;
      report_name?: string;
      submission_frequency: SubmissionFrequency;
      expected_file_name?: string;
    }> = [];

    for (const assignment of assignments) {
      const exists = await this.documentRepo.findOne({
        where: {
          unit_id: assignment.unit_id,
          document_type: assignment.document_type,
          period,
          year,
          uploaded_by: userId,
          is_deleted: false,
        },
      });

      if (exists) {
        continue;
      }

      const expectedBase = this.buildExpectedFileBase(assignment, period, year);
      options.push({
        assignment_id: assignment.id,
        unit_id: assignment.unit_id,
        unit_name: assignment.unit?.name,
        document_type: assignment.document_type,
        report_name: assignment.report_name,
        submission_frequency: assignment.submission_frequency,
        expected_file_name: expectedBase ? `${expectedBase}.docx/.pdf` : undefined,
      });
    }

    return options;
  }

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.versionRepo.find({
      where: { document_id: documentId },
      relations: ['uploader'],
      order: { version_number: 'DESC' },
    });
  }

  /**
   * Update document status
   */
  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await this.documentRepo.update(id, { status });
  }

  /**
   * Update extracted text
   */
  async updateExtractedText(id: string, text: string): Promise<void> {
    await this.documentRepo.update(id, { extracted_text: text });
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id, is_deleted: false },
      relations: ['uploader', 'versions', 'issuances'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    const [enriched] = await this.enrichDocumentsForWorkflow([document]);

    if ((enriched as any).is_linked) {
      throw new BadRequestException('Cannot delete a linked document. Unlink mappings first.');
    }

    const uploaderRole = document.uploader?.role;
    const shouldHardDelete =
      uploaderRole === UserRole.SUPER_ADMIN || uploaderRole === UserRole.REVIEWER;

    if (shouldHardDelete) {
      for (const version of document.versions || []) {
        await this.storageService.deleteFile(version.file_path);
        if (version.preview_path && version.preview_path !== version.file_path) {
          await this.storageService.deleteFile(version.preview_path);
        }
      }

      await this.documentRepo.remove(document);
      this.logger.log(`Document hard deleted: ${id}`);
      return;
    }

    if ((enriched as any).compliance_status !== ReviewDecision.COMPLIANT) {
      throw new BadRequestException('Only compliant documents can be deleted.');
    }

    document.is_deleted = true;
    await this.documentRepo.save(document);
    this.logger.log(`Document soft deleted: ${id}`);
  }

  async returnDocumentForRevision(payload: {
    document_id: string;
    remarks: string;
    returned_by: number;
  }): Promise<ManualReview> {
    const remarks = payload.remarks?.trim();
    if (!remarks) {
      throw new BadRequestException('Return remarks are required.');
    }

    const document = await this.documentRepo.findOne({
      where: { id: payload.document_id, is_deleted: false },
      relations: ['uploader'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      document.uploader?.role === UserRole.SUPER_ADMIN ||
      document.uploader?.role === UserRole.REVIEWER
    ) {
      throw new BadRequestException(
        'Documents uploaded by compliance/super admin require hard delete instead of return.',
      );
    }

    if (
      document.status === DocumentStatus.PROCESSING ||
      document.status === DocumentStatus.FAILED
    ) {
      throw new BadRequestException(
        'Documents currently being processed or in failed state cannot be returned. Please wait for processing to complete.',
      );
    }

    const version = await this.versionRepo.findOne({
      where: {
        document_id: payload.document_id,
        version_number: document.current_version,
      },
    });

    if (!version) {
      throw new NotFoundException('Current version not found');
    }

    const review = this.reviewRepo.create({
      document_id: payload.document_id,
      version_id: version.id,
      decision: ReviewDecision.NEEDS_REVISION,
      remarks,
      reviewer_id: payload.returned_by,
    });

    await this.reviewRepo.save(review);

    await this.documentRepo.update(payload.document_id, {
      status: DocumentStatus.PENDING,
    });

    this.logger.log(
      JSON.stringify({
        action: 'document.return',
        documentId: payload.document_id,
        returnedBy: payload.returned_by,
        reviewId: review.id,
      }),
    );

    return review;
  }

  /**
   * Focal-initiated archive: soft-delete a returned document so it no longer
   * appears in the active list but remains visible in the focal's archived view.
   */
  async archiveDocument(documentId: string, actorId: number): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
      relations: ['uploader'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.uploaded_by !== actorId) {
      throw new BadRequestException('You can only archive your own documents.');
    }

    // Check latest review to confirm it is actually a returned document
    const latestReview = await this.reviewRepo.findOne({
      where: { document_id: documentId },
      order: { reviewed_at: 'DESC' },
    });

    const isReturned =
      latestReview?.decision === ReviewDecision.NEEDS_REVISION ||
      latestReview?.decision === ReviewDecision.NON_COMPLIANT;

    if (!isReturned) {
      throw new BadRequestException(
        'Only returned (needs revision / non-compliant) documents can be archived.',
      );
    }

    await this.documentRepo.update(documentId, { is_deleted: true });
    this.logger.log(`Document archived by focal ${actorId}: ${documentId}`);
  }

  /**
   * Admin-initiated reprocess: re-queue process-document for a stuck/failed document.
   * Resets status to PENDING and re-enqueues the processing job for the current version.
   */
  async reprocessDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
      relations: ['versions'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const currentVersion = document.versions?.find(
      (v) => v.version_number === document.current_version,
    );

    if (!currentVersion) {
      throw new BadRequestException('No version found to reprocess.');
    }

    // Reset to PENDING so the processor picks it up
    await this.documentRepo.update(documentId, { status: DocumentStatus.PENDING });

    await this.documentQueue
      .add('process-document', {
        documentId: document.id,
        versionId: currentVersion.id,
      })
      .catch((err) => {
        this.logger.warn(`Failed to enqueue reprocess for ${documentId}: ${err?.message}`);
        throw err;
      });

    this.logger.log(`Document reprocess enqueued: ${documentId} version=${currentVersion.id}`);
  }
  }

  /**
   * Parse a stored period string into a human-readable bucket label and sort order.
   * Handles: YYYYMM (monthly), YYYYMM-MM (quarterly range), YYYYQ# (quarterly), YYYY (annual)
   */
  private parsePeriodBucket(period: string): { key: string; label: string; sortOrder: number } {
    const p = (period || '').trim();

    // Monthly: "202601" → January
    const monthly = /^(\d{4})(\d{2})$/.exec(p);
    if (monthly) {
      const month = parseInt(monthly[2], 10);
      const names = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return { key: `month-${monthly[2]}`, label: names[month - 1] || `Month ${month}`, sortOrder: month };
    }

    // Range: "202601-03" → Q1
    const range = /^(\d{4})(\d{2})-(\d{2})$/.exec(p);
    if (range) {
      const startM = parseInt(range[2], 10);
      const endM = parseInt(range[3], 10);
      const q = Math.ceil(startM / 3);
      const startName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        key: `q${q}`,
        label: `Q${q} (${startName[startM - 1]}–${startName[endM - 1]})`,
        sortOrder: 100 + q,
      };
    }

    // Quarter: "2026Q1" or "2026-Q1"
    const qtr = /^(\d{4})-?Q([1-4])$/i.exec(p);
    if (qtr) {
      const q = parseInt(qtr[2], 10);
      const qLabels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
      return { key: `q${q}`, label: `Q${q} (${qLabels[q - 1]})`, sortOrder: 100 + q };
    }

    // Annual: "2026" (4-digit only) or blank
    if (/^\d{4}$/.test(p) || p === '') {
      return { key: 'annual', label: 'Annual', sortOrder: 999 };
    }

    return { key: `other-${p}`, label: p || 'Other', sortOrder: 998 };
  }

  /**
   * Return all non-deleted documents grouped by year → period-bucket.
   * FOCAL users see only their own uploads; admins/reviewers see all.
   */
  async getRepository(actorRole: UserRole, actorId: number): Promise<{
    years: Array<{
      year: string;
      buckets: Array<{
        key: string;
        label: string;
        count: number;
        documents: Document[];
      }>;
    }>;
  }> {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.unit', 'unit')
      .leftJoinAndSelect('doc.uploader', 'uploader')
      .where('doc.is_deleted = :d', { d: false })
      .andWhere('doc.status = :readyStatus', { readyStatus: DocumentStatus.READY });

    if (actorRole === UserRole.FOCAL && actorId) {
      qb.andWhere('doc.uploaded_by = :actorId', { actorId });
    }

    qb.orderBy('doc.year', 'DESC').addOrderBy('doc.created_at', 'DESC');

    const docs = await qb.getMany();
    const enriched = await this.enrichDocumentsForWorkflow(docs);

    // Group: year → bucket-key → { label, sortOrder, documents[] }
    const yearMap = new Map<string, Map<string, { label: string; sortOrder: number; documents: Document[] }>>();

    for (const doc of enriched) {
      const y = doc.year || String(new Date((doc as any).created_at).getFullYear());
      const { key, label, sortOrder } = this.parsePeriodBucket(doc.period);
      if (!yearMap.has(y)) yearMap.set(y, new Map());
      const buckets = yearMap.get(y)!;
      if (!buckets.has(key)) buckets.set(key, { label, sortOrder, documents: [] });
      buckets.get(key)!.documents.push(doc);
    }

    const years = [...yearMap.keys()]
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({
        year,
        buckets: [...yearMap.get(year)!.entries()]
          .map(([key, v]) => ({ key, label: v.label, count: v.documents.length, documents: v.documents, sortOrder: v.sortOrder }))
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ sortOrder: _sortOrder, ...rest }) => rest),
      }));

    return { years };
  }
}
