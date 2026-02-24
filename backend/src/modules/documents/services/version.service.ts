import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { StorageService } from './storage.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface CreateVersionDto {
  document_id: string;
  uploaded_by: number;
  change_notes?: string;
  file: Express.Multer.File;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

  constructor(
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private storageService: StorageService,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  /**
   * Create a new version of an existing document
   */
  async createVersion(dto: CreateVersionDto): Promise<DocumentVersion> {
    const { document_id, uploaded_by, change_notes, file } = dto;

    // Validate document exists
    const document = await this.documentRepo.findOne({
      where: { id: document_id, is_deleted: false },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${document_id} not found`);
    }

    // Validate file type
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Only DOCX files are allowed');
    }

    // Get current version number
    const latestVersion = await this.versionRepo.findOne({
      where: { document_id },
      order: { version_number: 'DESC' },
    });

    const nextVersionNumber = latestVersion
      ? latestVersion.version_number + 1
      : 1;

    // Calculate checksum
    const checksum = this.storageService.calculateChecksum(file.buffer);

    // Check if file content is different from latest version
    if (latestVersion && latestVersion.checksum === checksum) {
      throw new BadRequestException(
        'File content is identical to the latest version',
      );
    }

    // Save file to storage
    const filePath = await this.storageService.saveFile(
      file.buffer,
      file.originalname,
      'documents',
    );

    // Create version entity
    const version = this.versionRepo.create({
      document_id,
      version_number: nextVersionNumber,
      file_name: file.originalname,
      file_path: filePath,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum,
      change_notes,
      uploaded_by,
    });

    await this.versionRepo.save(version);

    // Update document's current version and reset status
    document.current_version = nextVersionNumber;
    document.status = DocumentStatus.PENDING;
    await this.documentRepo.save(document);

    // Queue document processing job
    await this.documentQueue.add('process-document', {
      documentId: document_id,
      versionId: version.id,
    });

    this.logger.log(
      `New version created: ${version.id} (v${nextVersionNumber})`,
    );

    return version;
  }

  /**
   * Get version details by ID
   */
  async getVersionById(id: string): Promise<DocumentVersion> {
    const version = await this.versionRepo.findOne({
      where: { id },
      relations: ['document', 'uploader'],
    });

    if (!version) {
      throw new NotFoundException(`Version with ID ${id} not found`);
    }

    return version;
  }

  /**
   * Get file buffer for download
   */
  async downloadVersion(id: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const version = await this.getVersionById(id);

    const buffer = await this.storageService.readFile(version.file_path);

    return {
      buffer,
      fileName: version.file_name,
      mimeType: version.mime_type,
    };
  }

  /**
   * Get preview (PDF) for a version
   */
  async getPreview(id: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const version = await this.getVersionById(id);

    if (!version.preview_path) {
      throw new NotFoundException(
        'Preview not available for this version. It may still be processing.',
      );
    }

    const buffer = await this.storageService.readFile(version.preview_path);

    return {
      buffer,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Update preview path after generation
   */
  async updatePreviewPath(id: string, previewPath: string): Promise<void> {
    await this.versionRepo.update(id, { preview_path: previewPath });
    this.logger.log(`Preview path updated for version: ${id}`);
  }
}
