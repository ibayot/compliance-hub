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
      const version = await this.versionRepo.findOne({
        where: { id: versionId },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      // Read file from storage
      const fileBuffer = await this.storageService.readFile(version.file_path);

      // Extract text using Mammoth.js
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const extractedText = result.value;

      // Log any warnings from mammoth
      if (result.messages.length > 0) {
        this.logger.warn(
          `Mammoth warnings: ${JSON.stringify(result.messages)}`,
        );
      }

      // Update document with extracted text
      await this.documentRepo.update(documentId, {
        extracted_text: extractedText,
        status: DocumentStatus.READY,
      });

      this.logger.log(`Document processed successfully: ${documentId}`);

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
