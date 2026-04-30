import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Issuance } from '../entities/issuance.entity';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';

export interface CreateIssuanceDto {
  issuance_number: string;
  title: string;
  description?: string;
  issuance_type?: string;
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: Date;
  last_review_date?: Date;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: Date;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority: string;
  issue_date: Date;
  effectivity_date?: Date;
  source_url?: string;
  is_active?: boolean;
}

export interface UpdateIssuanceDto {
  title?: string;
  description?: string;
  issuance_type?: string;
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: Date;
  last_review_date?: Date;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: Date;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority?: string;
  issue_date?: Date;
  effectivity_date?: Date;
  source_url?: string;
  is_active?: boolean;
}

export interface LinkDocumentDto {
  document_id: string;
}

@Injectable()
export class IssuanceService implements OnModuleInit {
  private readonly logger = new Logger(IssuanceService.name);
  private hasDocumentIssuancesTable: boolean | null = null;

  constructor(
    @InjectRepository(Issuance)
    private issuanceRepo: Repository<Issuance>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    // Schema DDL for this service is managed via versioned migration files in
    // backend/database/migrations/. See v0.0.50-service-ddl-extraction.sql.
    //
    // NOTE: document_issuances pivot table is intentionally absent.
    // The compliance_hub.issuances table is the source of truth.
    // The ManyToMany join to document_issuances is guarded by canUseDocumentLinks().
    this.logger.log('IssuanceService initialized. Schema managed via migration files.');
  }

  private async canUseDocumentLinks(): Promise<boolean> {
    if (this.hasDocumentIssuancesTable !== null) {
      return this.hasDocumentIssuancesTable;
    }
    try {
      const rows = await this.dataSource.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'document_issuances' LIMIT 1",
      );
      this.hasDocumentIssuancesTable = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.hasDocumentIssuancesTable = false;
    }
    return this.hasDocumentIssuancesTable;
  }

  /**
   * Create a new issuance
   */
  async createIssuance(dto: CreateIssuanceDto): Promise<Issuance> {
    // Check if issuance number already exists
    const existing = await this.issuanceRepo.findOne({
      where: { issuance_number: dto.issuance_number },
    });

    if (existing) {
      throw new ConflictException('Issuance number already exists');
    }

    const issuance = this.issuanceRepo.create({
      ...dto,
      register_added_at: dto.register_added_at || new Date(),
    });
    await this.issuanceRepo.save(issuance);

    this.logger.log(`Created issuance: ${dto.issuance_number}`);
    return issuance;
  }

  /**
   * Get all issuances with optional filters
   */
  async getIssuances(filters?: {
    authority?: string;
    category?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<Issuance[]> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    const query = this.issuanceRepo.createQueryBuilder('issuance');
    if (canUseDocumentLinks) {
      query.leftJoinAndSelect('issuance.documents', 'documents');
    }

    if (filters?.authority) {
      query.andWhere('issuance.issuing_authority LIKE :authority', {
        authority: `%${filters.authority}%`,
      });
    }

    if (filters?.category) {
      query.andWhere('issuance.issuance_type = :category', {
        category: filters.category,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(issuance.issuance_number LIKE :search OR issuance.title LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.is_active !== undefined) {
      query.andWhere('issuance.is_active = :is_active', {
        is_active: filters.is_active,
      });
    }

    query.orderBy('issuance.issue_date', 'DESC');

    const results = await query.getMany();
    if (!canUseDocumentLinks) {
      results.forEach((item) => { (item as any).documents = []; });
    }
    return results;
  }

  /**
   * Get a single issuance by ID
   */
  async getIssuance(id: string): Promise<Issuance> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    const issuance = await this.issuanceRepo.findOne(
      canUseDocumentLinks
        ? { where: { id }, relations: ['documents', 'documents.unit'] }
        : { where: { id } },
    );

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (!canUseDocumentLinks) {
      (issuance as any).documents = [];
    }

    return issuance;
  }

  /**
   * Update an issuance
   */
  async updateIssuance(
    id: string,
    dto: UpdateIssuanceDto,
  ): Promise<Issuance> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    Object.assign(issuance, dto);
    await this.issuanceRepo.save(issuance);

    this.logger.log(`Updated issuance: ${id}`);
    return issuance;
  }

  /**
   * Delete an issuance
   */
  async deleteIssuance(id: string): Promise<void> {
    const result = await this.issuanceRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Issuance not found');
    }

    this.logger.log(`Deleted issuance: ${id}`);
  }

  /**
   * Link a document to an issuance
   */
  async linkDocument(issuanceId: string, documentId: string): Promise<void> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    if (!canUseDocumentLinks) {
      throw new BadRequestException('Document-issuance linking is unavailable: document_issuances table does not exist in the current schema.');
    }

    const issuance = await this.issuanceRepo.findOne({
      where: { id: issuanceId },
      relations: ['documents'],
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    const document = await this.documentRepo.findOne({
      where: { id: documentId, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.READY) {
      throw new BadRequestException('Only ready/compliant documents can be linked to issuances.');
    }

    // Add document if not already linked
    if (!(issuance.documents as any).find((d: any) => d.id === documentId)) {
      await this.issuanceRepo
        .createQueryBuilder()
        .relation(Issuance, 'documents')
        .of(issuanceId)
        .add(documentId);

      this.logger.log(`Linked document ${documentId} to issuance ${issuanceId}`);
    }
  }

  /**
   * Unlink a document from an issuance
   */
  async unlinkDocument(issuanceId: string, documentId: string): Promise<void> {
    const canUseDocumentLinks = await this.canUseDocumentLinks();
    if (!canUseDocumentLinks) {
      throw new BadRequestException('Document-issuance linking is unavailable: document_issuances table does not exist in the current schema.');
    }

    await this.issuanceRepo
      .createQueryBuilder()
      .relation(Issuance, 'documents')
      .of(issuanceId)
      .remove(documentId);

    this.logger.log(
      `Unlinked document ${documentId} from issuance ${issuanceId}`,
    );
  }

  private ensureAllowedAttachment(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    const fileName = file.originalname.toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx'];
    const isAllowed = allowed.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      throw new BadRequestException('Only PDF, DOC, and DOCX attachments are allowed');
    }
  }

  async uploadAttachment(id: string, file: Express.Multer.File): Promise<Issuance> {
    this.ensureAllowedAttachment(file);

    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    issuance.attachment_file_name = file.originalname;
    issuance.attachment_mime_type = file.mimetype || 'application/octet-stream';
    issuance.attachment_blob = file.buffer;
    issuance.attachment_uploaded_at = new Date();

    await this.issuanceRepo.save(issuance);
    this.logger.log(`Uploaded attachment for issuance: ${id}`);
    return issuance;
  }

  async deleteAttachment(id: string): Promise<void> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    issuance.attachment_file_name = null as any;
    issuance.attachment_mime_type = null as any;
    issuance.attachment_blob = null as any;
    issuance.attachment_uploaded_at = null as any;

    await this.issuanceRepo.save(issuance);
    this.logger.log(`Deleted attachment for issuance: ${id}`);
  }

  async getAttachment(id: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const issuance = await this.issuanceRepo
      .createQueryBuilder('issuance')
      .addSelect('issuance.attachment_blob')
      .where('issuance.id = :id', { id })
      .getOne();

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
    }

    if (!issuance.attachment_blob || !issuance.attachment_file_name) {
      throw new NotFoundException('Attachment not found for this issuance');
    }

    return {
      buffer: issuance.attachment_blob,
      fileName: issuance.attachment_file_name,
      mimeType: issuance.attachment_mime_type || 'application/octet-stream',
    };
  }
}
