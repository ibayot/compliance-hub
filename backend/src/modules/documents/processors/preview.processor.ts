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
    let tempDir: string | null = null;

    this.logger.log(`Generating preview for version: ${versionId}`);

    try {
      // Get version to access file path
      const version = await this.versionRepo
        .createQueryBuilder('version')
        .addSelect(['version.file_blob', 'version.preview_blob'])
        .where('version.id = :versionId', { versionId })
        .getOne();

      if (!version) {
        throw new Error('Version not found');
      }

      const sourceBuffer =
        version.file_blob ??
        (await this.storageService.readFile(version.file_path));

      if (!version.file_blob) {
        await this.versionRepo.update(versionId, { file_blob: sourceBuffer });
      }

      if (
        version.mime_type === 'application/pdf' ||
        version.file_name.toLowerCase().endsWith('.pdf')
      ) {
        await this.versionRepo.update(versionId, {
          preview_path: version.file_path,
          preview_blob: sourceBuffer,
        });
        this.logger.log(`Preview ready (native PDF): ${versionId}`);
        return;
      }

      // Create temp directory for conversion
      tempDir = path.join(
        this.storageService.getFullPath('temp'),
        `preview-${Date.now()}`,
      );
      await fs.mkdir(tempDir, { recursive: true });

      const sourceExt = path.extname(version.file_name) || '.docx';
      const sourceFileName = `${version.id}${sourceExt}`;
      const sourcePath = path.join(tempDir, sourceFileName);
      await fs.writeFile(sourcePath, sourceBuffer);

      // Convert DOCX to PDF using LibreOffice
      // Note: LibreOffice must be installed on the system
      const command = `soffice --headless --convert-to pdf --outdir "${tempDir}" "${sourcePath}"`;

      this.logger.log(`Executing: ${command}`);

      let pdfBuffer: Buffer;
      const sourceBaseName = path.basename(sourceFileName, sourceExt);
      const pdfFileName = `${sourceBaseName}.pdf`;
      const tempPdfPath = path.join(tempDir, pdfFileName);

      await execAsync(command, { timeout: 60000 }); // 60s timeout
      pdfBuffer = await fs.readFile(tempPdfPath);

      // Save PDF to storage
      const previewPath = await this.storageService.saveFile(
        pdfBuffer,
        `${version.file_name}.pdf`,
        'previews',
      );

      // Update version with preview path
      await this.versionRepo.update(versionId, {
        preview_path: previewPath,
        preview_blob: pdfBuffer,
      });

      // Clean up temp directory
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
    } finally {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }
}
