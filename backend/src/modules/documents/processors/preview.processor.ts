import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from '../services/storage.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

interface GeneratePreviewJob {
  versionId: string;
}

@Processor('document-processing')
export class PreviewGenerator {
  private readonly logger = new Logger(PreviewGenerator.name);

  constructor(
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
    private storageService: StorageService,
  ) {}

  @Process('generate-preview')
  async handlePreviewGeneration(job: Job<GeneratePreviewJob>) {
    const { versionId } = job.data;

    this.logger.log(`Generating preview for version: ${versionId}`);

    try {
      // Get version to access file path
      const version = await this.versionRepo.findOne({
        where: { id: versionId },
      });

      if (!version) {
        throw new Error('Version not found');
      }

      // Get full path to DOCX file
      const docxPath = this.storageService.getFullPath(version.file_path);

      // Create temp directory for conversion
      const tempDir = path.join(
        this.storageService.getFullPath('temp'),
        `preview-${Date.now()}`,
      );
      await fs.mkdir(tempDir, { recursive: true });

      // Convert DOCX to PDF using LibreOffice
      // Note: LibreOffice must be installed on the system
      const command = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`;

      this.logger.log(`Executing: ${command}`);

      await execAsync(command, { timeout: 60000 }); // 60s timeout

      // Get the generated PDF file name
      const docxFileName = path.basename(version.file_path, '.docx');
      const pdfFileName = `${docxFileName}.pdf`;
      const tempPdfPath = path.join(tempDir, pdfFileName);

      // Read the generated PDF
      const pdfBuffer = await fs.readFile(tempPdfPath);

      // Save PDF to storage
      const previewPath = await this.storageService.saveFile(
        pdfBuffer,
        `${version.file_name}.pdf`,
        'previews',
      );

      // Update version with preview path
      await this.versionRepo.update(versionId, {
        preview_path: previewPath,
      });

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      this.logger.log(`Preview generated successfully: ${versionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate preview: ${versionId}`,
        error.stack,
      );

      // Don't fail the job completely if preview generation fails
      // The document can still be used without preview
      this.logger.warn(
        'Preview generation failed, but document is still usable',
      );
    }
  }
}
