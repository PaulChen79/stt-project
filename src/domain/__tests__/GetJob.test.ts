import { describe, expect, it } from 'vitest';

import { Job } from '../entities/Job';
import { GetJob } from '../../usecases/GetJob';
import { JobRepository } from '../interfaces/ports/JobRepository';

class FakeRepo implements JobRepository {
  constructor(private readonly job: Job | null) {}
  async create(): Promise<void> {}
  async getById(): Promise<Job | null> {
    return this.job;
  }
  async update(): Promise<void> {}
  async markFailed(): Promise<void> {}
  async listExpired(): Promise<Job[]> {
    return [];
  }
  async deleteById(): Promise<void> {}
}

describe('GetJob', () => {
  it('returns job when found', async () => {
    const job = new Job({
      id: 'job-1',
      status: 'pending',
      originalFilename: 'a.wav',
      audioPath: '/tmp/a.wav',
      transcript: null,
      summary: null,
      error: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    });
    const useCase = new GetJob({ jobRepository: new FakeRepo(job) });

    const result = await useCase.execute({ jobId: 'job-1' });

    expect(result.job).toBe(job);
  });

  it('returns null when missing', async () => {
    const useCase = new GetJob({ jobRepository: new FakeRepo(null) });

    const result = await useCase.execute({ jobId: 'job-2' });

    expect(result.job).toBeNull();
  });
});
