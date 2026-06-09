import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { StorageService } from '../services/storage.service';
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as mammoth from 'mammoth';

interface GeneratePreviewJob {
  versionId: string;
}

@Processor('document-processing')
export class PreviewGenerator {
  private readonly logger = new Logger(PreviewGenerator.name);

  private runSofficeConvert(tempDir: string, sourcePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'soffice',
        ['--headless', '--convert-to', 'pdf', '--outdir', tempDir, sourcePath],
        { shell: false },
      );

      let stderr = '';
      let stdout = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`soffice exited with code ${code}. stdout=${stdout} stderr=${stderr}`));
      });
    });
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeLeadingFilenameHeading(
    htmlBody: string,
    fileName: string,
    displayTitle: string,
  ): string {
    const escapedDisplayTitle = displayTitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const fullNamePattern = this.escapeRegExp(fileName.trim());
    const baseName = fileName.replace(/\.[^.]+$/, '').trim();
    const baseNamePattern = this.escapeRegExp(baseName);

    const fullHeadingRegex = new RegExp(`(<h1\\b[^>]*>)\\s*${fullNamePattern}\\s*(<\\/h1>)`, 'i');
    if (fullHeadingRegex.test(htmlBody)) {
      return htmlBody.replace(fullHeadingRegex, `$1${escapedDisplayTitle}$2`);
    }

    const baseHeadingRegex = new RegExp(`(<h1\\b[^>]*>)\\s*${baseNamePattern}\\s*(<\\/h1>)`, 'i');
    if (baseHeadingRegex.test(htmlBody)) {
      return htmlBody.replace(baseHeadingRegex, `$1${escapedDisplayTitle}$2`);
    }

    return htmlBody;
  }

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
        .leftJoinAndSelect('version.document', 'document')
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

      const extCandidate = (path.extname(version.file_name) || '.docx').toLowerCase();
      const allowedExts = new Set(['.docx', '.doc', '.odt', '.rtf']);
      const sourceExt = allowedExts.has(extCandidate) ? extCandidate : '.docx';
      const sourceFileName = `${version.id}${sourceExt}`;
      const sourcePath = path.join(tempDir, sourceFileName);
      await fs.writeFile(sourcePath, sourceBuffer);

      // Convert DOCX to PDF using LibreOffice
      // Note: LibreOffice must be installed on the system
      this.logger.log(`Executing soffice conversion for version ${versionId}`);

      let pdfBuffer: Buffer;
      const sourceBaseName = path.basename(sourceFileName, sourceExt);
      const pdfFileName = `${sourceBaseName}.pdf`;
      const tempPdfPath = path.join(tempDir, pdfFileName);

      try {
        await this.runSofficeConvert(tempDir, sourcePath);
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
          preview_mime_type: 'application/pdf',
        });

        this.logger.log(`Preview generated via LibreOffice: ${versionId}`);
      } catch (libreOfficeError) {
        this.logger.warn(
          `LibreOffice conversion failed for ${versionId}: ${(libreOfficeError as Error)?.message}. Falling back to HTML preview.`,
        );

        // Fallback: use mammoth to convert DOCX to HTML
        await this.generateHtmlFallbackPreview(versionId, version, sourceBuffer, tempDir);
      }

      // Clean up temp directory
      this.logger.log(`Preview generation complete: ${versionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate preview: ${versionId}`,
        error.stack,
      );

      // Final fallback: generate a plain HTML preview from extracted text
      try {
        const version = await this.versionRepo.findOne({ where: { id: versionId }, relations: ['document'] });
        if (version) {
          const displayTitle = version.document?.title || version.document?.document_type || version.file_name;
          await this.generateTextFallbackPreview(versionId, displayTitle, version.extracted_text || '');
        }
      } catch {
        this.logger.warn('All preview generation attempts failed, document is still usable without preview.');
      }
    } finally {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  private async generateHtmlFallbackPreview(
    versionId: string,
    version: DocumentVersion,
    sourceBuffer: Buffer,
    _tempDir: string,
  ): Promise<void> {
    try {
      let htmlBody = '';

      const isDocx =
        version.file_name.toLowerCase().endsWith('.docx') ||
        version.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (isDocx) {
        const result = await mammoth.convertToHtml({ buffer: sourceBuffer });
        htmlBody = result.value || '<p><em>No content extracted.</em></p>';
        if (result.messages && result.messages.length > 0) {
          this.logger.warn(`Mammoth warnings for ${versionId}: ${result.messages.map((m) => m.message).join(', ')}`);
        }
      } else {
        htmlBody = `<p><em>Preview not available for file type: ${version.mime_type}.</em></p>`;
      }

      const displayTitle = version.document?.title || version.document?.document_type || version.file_name;
      htmlBody = this.normalizeLeadingFilenameHeading(htmlBody, version.file_name, displayTitle);
      const htmlContent = this.buildStyledHtml(displayTitle, htmlBody);
      const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

      await this.versionRepo.update(versionId, {
        preview_blob: htmlBuffer,
        preview_mime_type: 'text/html',
        preview_path: null,
      });

      this.logger.log(`HTML fallback preview generated for version: ${versionId}`);
    } catch (err) {
      this.logger.error(`HTML fallback preview generation failed: ${versionId}`, (err as Error)?.stack);
      throw err;
    }
  }

  private async generateTextFallbackPreview(
    versionId: string,
    fileName: string,
    extractedText: string,
  ): Promise<void> {
    const safeText = extractedText
      ? extractedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      : 'No text content available for this document.';

    const htmlContent = this.buildStyledHtml(fileName, `<pre style="white-space: pre-wrap; font-family: inherit;">${safeText}</pre>`);
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

    await this.versionRepo.update(versionId, {
      preview_blob: htmlBuffer,
      preview_mime_type: 'text/html',
      preview_path: null,
    });

    this.logger.log(`Text fallback preview generated for version: ${versionId}`);
  }

  private buildStyledHtml(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #222;
      background: #fff;
      padding: 40px 48px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1, h2, h3, h4, h5, h6 { color: #1a237e; margin-top: 1.5em; margin-bottom: 0.5em; }
    h1 { font-size: 1.8em; border-bottom: 2px solid #1a237e; padding-bottom: 8px; }
    h2 { font-size: 1.4em; }
    h3 { font-size: 1.2em; }
    p { margin: 0.6em 0 1em; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #e8eaf6; font-weight: 600; }
    tr:nth-child(even) td { background: #f9f9f9; }
    ul, ol { margin: 0.5em 0 1em 1.5em; }
    li { margin-bottom: 0.3em; }
    strong, b { font-weight: 700; }
    em, i { font-style: italic; }
    pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 2px; font-family: monospace; }
    .document-header {
      background: #e8eaf6;
      border-left: 4px solid #3949ab;
      padding: 12px 16px;
      margin-bottom: 24px;
      border-radius: 0 4px 4px 0;
    }
    .document-header .display-name { font-size: 0.85em; color: #555; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="document-header">
    <strong>Document Viewer</strong>
    <div class="display-name">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
  ${body}
</body>
</html>`;
  }
}
