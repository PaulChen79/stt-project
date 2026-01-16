import { describe, expect, it } from 'vitest';

import { CleanupExpiredJobs } from '../../usecases/CleanupExpiredJobs';
import { Job } from '../entities/Job';
import { Clock } from '../interfaces/ports/Clock';
import { FileStorage } from '../interfaces/ports/FileStorage';
import { JobRepository } from '../interfaces/ports/JobRepository';

class FixedClock implements Clock {
  now(): Date {
    return new Date('2026-01-10T00:00:00.000Z');
  }
}

class FakeStorage implements FileStorage {
  public deleted: string[] = [];
  async save(): Promise<{ path: string; sizeBytes: number }> {
    return { path: '', sizeBytes: 0 };
  }
  async delete(path: string): Promise<void> {
    this.deleted.push(path);
  }
  async exists(): Promise<boolean> {
    return true;
  }
}

class FakeRepo implements JobRepository {
  public deletedIds: string[] = [];
  private readonly jobs: Job[];
  constructor(jobs: Job[]) {
    this.jobs = jobs;
  }
  async create(): Promise<void> {}
  async getById(): Promise<Job | null> {
    return null;
  }
  async listRecent(): Promise<Job[]> {
    return [];
  }
  async update(): Promise<void> {}
  async markFailed(): Promise<void> {}
  async listExpired(): Promise<Job[]> {
    return this.jobs;
  }
  async deleteById(id: string): Promise<void> {
    this.deletedIds.push(id);
  }
}

describe('CleanupExpiredJobs', () => {
  it('deletes expired jobs and files', async () => {
    const job = new Job({
      id: 'job-1',
      status: 'completed',
      originalFilename: 'a.wav',
      audioPath: '/tmp/a.wav',
      transcript: 't',
      summary: 's',
      error: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    });

    const storage = new FakeStorage();
    const repo = new FakeRepo([job]);
    const useCase = new CleanupExpiredJobs({
      clock: new FixedClock(),
      fileStorage: storage,
      jobRepository: repo,
    });

    const result = await useCase.execute();

    expect(result.deleted).toBe(1);
    expect(storage.deleted).toEqual(['/tmp/a.wav']);
    expect(repo.deletedIds).toEqual(['job-1']);
  });
});
