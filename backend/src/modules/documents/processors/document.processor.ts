import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from '../services/storage.service';
import { InjectQueue } from '@nestjs/bull';
import * as mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

interface ProcessDocumentJob {
  documentId: string;
  versionId: string;
}

@Processor('document-processing')
export class DocumentProcessor {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private storageService: StorageService,
    @InjectQueue('document-processing') private documentQueue: Queue,
  ) {}

  @Process('process-document')
  async handleDocumentProcessing(job: Job<ProcessDocumentJob>) {
    const { documentId, versionId } = job.data;

    this.logger.log(
      `Processing document: ${documentId}, version: ${versionId}`,
    );

    try {
      // Update status to processing
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.PROCESSING,
      });

      // Get version to access file path
      const version = await this.versionRepo
        .createQueryBuilder('version')
        .addSelect('version.file_blob')
        .where('version.id = :versionId', { versionId })
        .getOne();

      if (!version) {
        throw new Error('Version not found');
      }

      // Read file from blob first, then fallback to filesystem for backward compatibility
      const fileBuffer =
        version.file_blob ??
        (await this.storageService.readFile(version.file_path));

      if (!version.file_blob) {
        await this.versionRepo.update(versionId, { file_blob: fileBuffer });
      }

      let extractedText = '';

      try {
        if (
          version.mime_type === 'application/pdf' ||
          version.file_name.toLowerCase().endsWith('.pdf')
        ) {
          const pdfResult = await pdfParse(fileBuffer);
          extractedText = pdfResult.text || '';
        } else {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value;

          if (result.messages.length > 0) {
            this.logger.warn(
              `Mammoth warnings: ${JSON.stringify(result.messages)}`,
            );
          }
        }
      } catch (error: any) {
        extractedText = '';
        this.logger.warn(
          `Text extraction failed for version ${versionId}. Continuing with empty extracted_text. Reason: ${error?.message || 'unknown error'}`,
        );
      }

      // Update document with extracted text
      await this.documentRepo.update(documentId, {
        extracted_text: extractedText,
        status: DocumentStatus.READY,
      });

      // Keep extracted text on the processed version as well
      await this.versionRepo.update(versionId, {
        extracted_text: extractedText,
      });

      this.logger.log(`Document processed successfully: ${documentId}`);

      // Queue preview generation
      await this.documentQueue.add('generate-preview', {
        versionId,
      });

      // Queue metrics computation
      await this.documentQueue.add('compute-metrics', {
        versionId,
      });

      this.logger.log(`Queued metrics computation for version: ${versionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process document: ${documentId}`,
        error.stack,
      );

      // Update status to failed
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.FAILED,
      });

      throw error;
    }
  }
}
