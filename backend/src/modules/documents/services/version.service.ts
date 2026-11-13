import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { Document, DocumentStatus } from '../entities/document.entity';
import { StorageService } from './storage.service';
import { RoleCapabilitiesService } from '../../users/role-capabilities.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as mammoth from 'mammoth';
import * as path from 'path';
import { DocumentActor, isDocumentInScope } from './document-access';

export interface CreateVersionDto {
  document_id: string;
  uploaded_by: number;
  change_notes?: string;
  file: Express.Multer.File;
}

@Injectable()
export class VersionService {
  private readonly logger = new Logger(VersionService.name);

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
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private storageService: StorageService,
    @InjectQueue('document-processing') private documentQueue: Queue,
    private readonly roleCapSvc: RoleCapabilitiesService,
  ) {}

  private async getVersionWithBlobs(documentId: string, id: string, actor: DocumentActor): Promise<DocumentVersion> {
    const version = await this.versionRepo
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.document', 'document')
      .addSelect(['version.file_blob', 'version.preview_blob'])
      .where('version.id = :id', { id })
      .andWhere('version.document_id = :documentId', { documentId })
      .getOne();

    const isFocal = this.roleCapSvc.isFocal(actor.role);
    if (!version || version.document_id !== documentId || !isDocumentInScope(version.document, actor, isFocal)) {
      throw new NotFoundException('Document version not found');
    }

    const unitIds = (actor.units ?? []).map((unit) => Number(typeof unit === 'object' ? unit.id : unit));
    const canAccess = this.roleCapSvc.isDocumentsAccess(actor.role) ||
      Number(version.document.uploaded_by) === Number(actor.id) || unitIds.includes(Number(version.document.unit_id));
    if (!canAccess) throw new ForbiddenException('You are not authorized to access this document.');

    return version;
  }

  /**
   * Create a new version of an existing document
   */
  async createVersion(dto: CreateVersionDto, actor: DocumentActor): Promise<DocumentVersion> {
    const { document_id, uploaded_by, change_notes, file } = dto;
    if (!file?.buffer?.length) throw new BadRequestException('Choose a document to upload.');

    // Validate document exists
    const document = await this.documentRepo.findOne({
      where: { id: document_id, is_deleted: false },
    });

    if (!document || !isDocumentInScope(document, actor, this.roleCapSvc.isFocal(actor.role))) {
      throw new NotFoundException('Document not found');
    }

    // Validate file type
    const safeName = path.basename(file.originalname).replace(/[\r\n"\\/]/g, '_').slice(0, 180);
    const isDocx = safeName.toLowerCase().endsWith('.docx');
    const isPdf = safeName.toLowerCase().endsWith('.pdf');
    const isPdfSignature = file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const isDocxSignature = file.buffer.subarray(0, 4).toString('binary') === 'PK\x03\x04' &&
      file.buffer.includes(Buffer.from('[Content_Types].xml')) && file.buffer.includes(Buffer.from('word/'));
    if ((!isPdf && !isDocx) || (isPdf && !isPdfSignature) || (isDocx && !isDocxSignature)) {
      throw new BadRequestException('Only valid DOCX and PDF files are allowed');
    }

    const checksum = this.storageService.calculateChecksum(file.buffer);
    const extractedText = await this.extractInitialText(file);
    const filePath = await this.storageService.saveFile(
      file.buffer,
      safeName,
      'documents',
    );

    const versionData = {
      file_name: safeName,
      file_path: filePath,
      file_blob: file.buffer,
      mime_type: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: file.size,
      checksum,
      preview_path: isPdf ? filePath : null,
      preview_blob: isPdf ? file.buffer : undefined,
      extracted_text: extractedText,
      change_notes,
      uploaded_by,
    };

    let version: DocumentVersion;
    try {
      version = await this.documentRepo.manager.transaction(async (manager) => {
        const documents = manager.getRepository(Document);
        const versions = manager.getRepository(DocumentVersion);
        const parent = await documents.findOne({
          where: { id: document_id, is_deleted: false },
          lock: { mode: 'pessimistic_write' },
        });
        if (!parent || !isDocumentInScope(parent, actor, this.roleCapSvc.isFocal(actor.role))) {
          throw new NotFoundException('Document not found');
        }
        const latest = await versions.findOne({ where: { document_id }, order: { version_number: 'DESC' } });
        if (latest?.checksum === checksum) {
          throw new BadRequestException('File content is identical to the latest version');
        }
        const versionNumber = Math.max(latest?.version_number ?? 0, parent.current_version) + 1;
        const saved = await versions.save({ ...versionData, document_id, version_number: versionNumber });
        await documents.update(document_id, {
          current_version: versionNumber,
          status: DocumentStatus.PENDING,
          extracted_text: extractedText,
          file_blob: file.buffer,
        });
        return saved;
      });
    } catch (error) {
      await this.storageService.discardUnreferencedUpload(filePath, () => this.versionRepo.existsBy({ file_path: filePath }));
      throw error;
    }

    // Queue document processing job
    void this.documentQueue
      .add('process-document', {
        documentId: document_id,
        versionId: version.id,
      })
      .catch(async (error) => {
        this.logger.warn(
          `Background processing queue unavailable for version ${version.id}: ${error?.message || 'unknown error'}`,
        );
        await this.documentRepo.update(
          { id: document_id, current_version: version.version_number, status: DocumentStatus.PENDING },
          { status: DocumentStatus.FAILED },
        ).catch(() => this.logger.warn('Could not record the version processing failure.'));
      });

    this.logger.log(`New version created: ${version.id} (v${version.version_number})`);

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
  async downloadVersion(documentId: string, id: string, actor: DocumentActor): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const version = await this.getVersionWithBlobs(documentId, id, actor);

    const buffer = version.file_blob ?? (await this.storageService.readFile(version.file_path));

    return {
      buffer,
      fileName: version.file_name,
      mimeType: version.mime_type,
    };
  }

  /**
   * Get preview for a version (PDF or HTML fallback)
   */
  async getPreview(documentId: string, id: string, actor: DocumentActor): Promise<{
    buffer: Buffer;
    mimeType: string;
  }> {
    const version = await this.getVersionWithBlobs(documentId, id, actor);

    // Priority 1: explicit preview blob (HTML or PDF generated by processor)
    if (version.preview_blob) {
      return {
        buffer: version.preview_blob,
        mimeType: version.preview_mime_type || 'application/pdf',
      };
    }

    // Priority 2: raw PDF file as preview (only when no preview blob exists)
    if (
      version.mime_type === 'application/pdf' ||
      version.file_name.toLowerCase().endsWith('.pdf')
    ) {
      const buffer = version.file_blob ?? (await this.storageService.readFile(version.file_path));
      return {
        buffer,
        mimeType: 'application/pdf',
      };
    }

    // Priority 3: on-demand mammoth HTML for DOCX files (queue may not have run yet)
    const ext = path.extname(version.file_name).toLowerCase();
    const isDocx =
      ext === '.docx' ||
      version.mime_type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isDocx) {
      try {
        const fileBuffer =
          version.file_blob ?? (await this.storageService.readFile(version.file_path));

        const result = await mammoth.convertToHtml({ buffer: fileBuffer });
        const htmlBody = result.value || '<p><em>No content extracted.</em></p>';

        const htmlContent = [
          '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">',
          '<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;',
          'margin:0 auto;line-height:1.7;color:#222;}',
          'h1{color:#1a237e;border-bottom:2px solid #1a237e;padding-bottom:8px;}',
          'h2{color:#283593;margin-top:24px;}h3{color:#3949ab;}',
          'table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:8px;}',
          'th{background:#e8eaf6;}p{margin:8px 0;}</style></head>',
          `<body><h1>${version.file_name.replace(/</g, '&lt;')}</h1>`,
          htmlBody,
          '</body></html>',
        ].join('');

        const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

        // Cache the preview for future requests (non-blocking)
        this.versionRepo
          .update(id, {
            preview_blob: htmlBuffer,
            preview_mime_type: 'text/html',
            preview_path: null,
          })
          .catch((err) =>
            this.logger.warn(
              `Non-critical: failed to cache DOCX preview for ${id}: ${err?.message}`,
            ),
          );

        return { buffer: htmlBuffer, mimeType: 'text/html' };
      } catch (err) {
        this.logger.warn(
          `On-demand mammoth conversion failed for ${id}: ${(err as Error)?.message}`,
        );
        // Fall through to error
      }
    }

    if (!version.preview_path) {
      throw new NotFoundException(
        'Preview not available for this version. It may still be processing.',
      );
    }

    const buffer = await this.storageService.readFile(version.preview_path);

    return {
      buffer,
      mimeType: version.preview_mime_type || 'application/pdf',
    };
  }

  /**
   * Update preview path after generation
   */
  async updatePreviewPath(id: string, previewPath: string, previewBlob?: Buffer): Promise<void> {
    await this.versionRepo.update(id, {
      preview_path: previewPath,
      preview_blob: previewBlob,
    });
    this.logger.log(`Preview path updated for version: ${id}`);
  }
}
