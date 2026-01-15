export interface FileStorage {
  save(input: {
    jobId: string;
    originalFilename: string;
    buffer: Buffer;
  }): Promise<{ path: string; sizeBytes: number }>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
