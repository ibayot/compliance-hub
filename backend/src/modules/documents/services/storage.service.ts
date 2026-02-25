import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageRoot: string;

  constructor(private configService: ConfigService) {
    this.storageRoot = this.configService.get<string>(
      'STORAGE_PATH',
      './storage',
    );
    this.ensureStorageDirectories();
  }

  private async ensureStorageDirectories() {
    const directories = ['documents', 'previews', 'temp'];
    for (const dir of directories) {
      const fullPath = path.join(this.storageRoot, dir);
      try {
        await fs.access(fullPath);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
        this.logger.log(`Created storage directory: ${fullPath}`);
      }
    }
  }

  private async ensureSubDirectoryExists(subDir: 'documents' | 'previews' | 'temp'): Promise<void> {
    const fullPath = path.join(this.storageRoot, subDir);
    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Save a file to storage
   * @param buffer File buffer
   * @param fileName Original file name
   * @param subDir Subdirectory (documents, previews, temp)
   * @returns File path relative to storage root
   */
  async saveFile(
    buffer: Buffer,
    fileName: string,
    subDir: 'documents' | 'previews' | 'temp' = 'documents',
  ): Promise<string> {
    await this.ensureSubDirectoryExists(subDir);

    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(fileName);
    const uniqueName = `${timestamp}-${sanitizedName}`;
    const relativePath = path.join(subDir, uniqueName);
    const fullPath = path.join(this.storageRoot, relativePath);

    await fs.writeFile(fullPath, buffer);
    this.logger.log(`File saved: ${relativePath}`);

    return relativePath;
  }

  /**
   * Read a file from storage
   * @param filePath Relative path from storage root
   * @returns File buffer
   */
  async readFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.storageRoot, filePath);
    try {
      return await fs.readFile(fullPath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new NotFoundException(`Stored file not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get a readable stream for a file
   * @param filePath Relative path from storage root
   * @returns Readable stream
   */
  async getFileStream(filePath: string): Promise<Readable> {
    return Readable.from(await this.readFile(filePath));
  }

  /**
   * Delete a file from storage
   * @param filePath Relative path from storage root
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.storageRoot, filePath);
    try {
      await fs.unlink(fullPath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
    }
  }

  /**
   * Check if file exists
   * @param filePath Relative path from storage root
   * @returns Boolean indicating if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.storageRoot, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate SHA-256 checksum of a buffer
   * @param buffer File buffer
   * @returns Hex-encoded checksum
   */
  calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get the full file system path
   * @param filePath Relative path from storage root
   * @returns Absolute file system path
   */
  getFullPath(filePath: string): string {
    return path.join(this.storageRoot, filePath);
  }

  /**
   * Sanitize file name to prevent path traversal
   * @param fileName Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
