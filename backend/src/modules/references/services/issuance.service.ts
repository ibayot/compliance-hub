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

  constructor(
    @InjectRepository(Issuance)
    private issuanceRepo: Repository<Issuance>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      ALTER TABLE issuances
      ADD COLUMN IF NOT EXISTS attachment_file_name VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS attachment_mime_type VARCHAR(120) NULL,
      ADD COLUMN IF NOT EXISTS attachment_blob LONGBLOB NULL,
      ADD COLUMN IF NOT EXISTS attachment_uploaded_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS binding_nature VARCHAR(60) NULL,
      ADD COLUMN IF NOT EXISTS adoption_basis TEXT NULL,
      ADD COLUMN IF NOT EXISTS applicable_provisions TEXT NULL,
      ADD COLUMN IF NOT EXISTS compliance_obligations TEXT NULL,
      ADD COLUMN IF NOT EXISTS required_evidence TEXT NULL,
      ADD COLUMN IF NOT EXISTS evidence_location TEXT NULL,
      ADD COLUMN IF NOT EXISTS process_owner VARCHAR(160) NULL,
      ADD COLUMN IF NOT EXISTS frequency_cadence VARCHAR(80) NULL,
      ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS gap_summary TEXT NULL,
      ADD COLUMN IF NOT EXISTS action_required TEXT NULL,
      ADD COLUMN IF NOT EXISTS target_date DATE NULL,
      ADD COLUMN IF NOT EXISTS last_review_date DATE NULL,
      ADD COLUMN IF NOT EXISTS quarterly_readiness VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS q1_compliance_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS q2_compliance_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS q3_compliance_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS q4_compliance_status VARCHAR(40) NULL,
      ADD COLUMN IF NOT EXISTS register_added_at DATE NULL;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS document_issuances (
        issuance_id VARCHAR(36) NOT NULL,
        document_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (issuance_id, document_id),
        KEY idx_document_issuances_document (document_id),
        CONSTRAINT fk_document_issuances_issuance FOREIGN KEY (issuance_id) REFERENCES issuances(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_issuances_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
    `);
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
    const query = this.issuanceRepo
      .createQueryBuilder('issuance')
      .leftJoinAndSelect('issuance.documents', 'documents');

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

    return query.getMany();
  }

  /**
   * Get a single issuance by ID
   */
  async getIssuance(id: string): Promise<Issuance> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id },
      relations: ['documents', 'documents.unit'],
    });

    if (!issuance) {
      throw new NotFoundException('Issuance not found');
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
