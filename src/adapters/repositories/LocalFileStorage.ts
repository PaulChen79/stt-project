import { promises as fs } from 'fs';
import path from 'path';

import { FileStorage } from '../../domain/interfaces/ports/FileStorage';

export class LocalFileStorage implements FileStorage {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async save(input: {
    jobId: string;
    originalFilename: string;
    buffer: Buffer;
  }): Promise<{ path: string; sizeBytes: number }> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const extension = path.extname(input.originalFilename) || '.dat';
    const filename = `${input.jobId}${extension}`;
    const fullPath = path.join(this.baseDir, filename);
    await fs.writeFile(fullPath, input.buffer);
    return { path: fullPath, sizeBytes: input.buffer.length };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
