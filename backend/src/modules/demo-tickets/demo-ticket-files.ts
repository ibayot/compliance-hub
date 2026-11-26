import { BadRequestException, Injectable } from '@nestjs/common';
import { lstat, mkdir, readFile, realpath, rmdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type DemoFileKey = { runId: string; ticketId: string; attachmentId: string };

@Injectable()
export class DemoTicketFiles {
  private readonly uploads = resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));

  fileType(buffer: Buffer): string {
    if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
    if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
    throw new BadRequestException('Attach a JPG, PNG, WebP or PDF file.');
  }

  private async filePath(key: DemoFileKey, create = false) {
    let directory = await realpath(this.uploads);
    const { runId, ticketId, attachmentId } = key;
    if (![runId, ticketId, attachmentId].every(value => UUID.test(value))) throw new Error('Invalid demo file key.');
    for (const part of ['demo', runId, ticketId]) {
      directory = join(directory, part);
      if (create) {
        await mkdir(directory, { mode: 0o750 }).catch(error => {
          if (error.code !== 'EEXIST') throw error;
        });
      }
      const entry = await lstat(directory);
      if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error('Invalid demo file directory.');
    }
    return join(directory, attachmentId);
  }

  async write(key: DemoFileKey, content: Buffer) {
    await mkdir(this.uploads, { recursive: true });
    await writeFile(await this.filePath(key, true), content, { flag: 'wx', mode: 0o640 });
  }

  async read(key: DemoFileKey) {
    const path = await this.filePath(key);
    if (!(await lstat(path)).isFile()) throw new Error('Invalid demo file.');
    return readFile(path);
  }

  async remove(key: DemoFileKey) {
    try {
      const path = await this.filePath(key);
      await unlink(path).catch(error => { if (error.code !== 'ENOENT') throw error; });
      for (const dir of [dirname(path), dirname(dirname(path))]) {
        await rmdir(dir).catch(error => { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
