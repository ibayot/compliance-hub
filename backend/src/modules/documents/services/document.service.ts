import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from './storage.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface UploadDocumentDto {
  title: string;
  document_type: string;
  period: string;
  year: string;
  unit_id: number;
  uploaded_by: number;
  file: Express.Multer.File;
}

export interface ListDocumentsDto {
  unit_id?: string;
  document_type?: string;
  period?: string;
  year?: string;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private storageService: StorageService,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  /**
   * Upload a new document
   */
  async uploadDocument(dto: UploadDocumentDto): Promise<Document> {
    const { file, ...metadata } = dto;

    // Validate file type
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Only DOCX files are allowed');
    }

    // Calculate checksum
    const checksum = this.storageService.calculateChecksum(file.buffer);

    // Save file to storage
    const filePath = await this.storageService.saveFile(
      file.buffer,
      file.originalname,
      'documents',
    );

    // Create document entity
    const document = this.documentRepo.create({
      ...metadata,
      status: DocumentStatus.PENDING,
      current_version: 1,
    });
    await this.documentRepo.save(document);

    // Create version entity
    const version = this.versionRepo.create({
      document_id: document.id,
      version_number: 1,
      file_name: file.originalname,
      file_path: filePath,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum,
      uploaded_by: metadata.uploaded_by,
    });
    await this.versionRepo.save(version);

    // Queue document processing job
    await this.documentQueue.add('process-document', {
      documentId: document.id,
      versionId: version.id,
    });

    this.logger.log(`Document uploaded: ${document.id}`);

    return document;
  }

  /**
   * Get document by ID with relations
   */
  async getDocumentById(id: string): Promise<Document> {
    const document = await this.documentRepo.findOne({
      where: { id, is_deleted: false },
      relations: ['unit', 'uploader', 'versions', 'versions.uploader'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return document;
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
      unit_id,
      document_type,
      period,
      year,
      status,
      page = 1,
      limit = 20,
    } = dto;

    const query = this.documentRepo
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.unit', 'unit')
      .leftJoinAndSelect('doc.uploader', 'uploader')
      .where('doc.is_deleted = :isDeleted', { isDeleted: false });

    if (unit_id) {
      query.andWhere('doc.unit_id = :unit_id', { unit_id });
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

    query.orderBy('doc.created_at', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
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
   * Soft delete document
   */
  async deleteDocument(id: string): Promise<void> {
    const document = await this.getDocumentById(id);
    document.is_deleted = true;
    await this.documentRepo.save(document);
    this.logger.log(`Document soft deleted: ${id}`);
  }
}
