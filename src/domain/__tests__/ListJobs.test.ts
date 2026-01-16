import { describe, expect, it } from 'vitest';

import { Job } from '../entities/Job';
import { ListJobs } from '../../usecases/ListJobs';
import { JobRepository } from '../interfaces/ports/JobRepository';

class FakeRepo implements JobRepository {
  public lastLimit = 0;
  constructor(private readonly jobs: Job[]) {}
  async create(): Promise<void> {}
  async getById(): Promise<Job | null> {
    return null;
  }
  async listRecent(limit: number): Promise<Job[]> {
    this.lastLimit = limit;
    return this.jobs.slice(0, limit);
  }
  async update(): Promise<void> {}
  async markFailed(): Promise<void> {}
  async listExpired(): Promise<Job[]> {
    return [];
  }
  async deleteById(): Promise<void> {}
}

const makeJob = (id: string) =>
  new Job({
    id,
    status: 'processing',
    originalFilename: 'a.wav',
    audioPath: '/tmp/a.wav',
    transcript: null,
    summary: null,
    error: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-01-08T00:00:00.000Z'),
  });

describe('ListJobs', () => {
  it('caps limit to max 100 and min 1', async () => {
    const repo = new FakeRepo([makeJob('job-1')]);
    const useCase = new ListJobs({ jobRepository: repo });

    await useCase.execute({ limit: 0 });
    expect(repo.lastLimit).toBe(1);

    await useCase.execute({ limit: 1000 });
    expect(repo.lastLimit).toBe(100);
  });

  it('returns jobs', async () => {
    const repo = new FakeRepo([makeJob('job-1'), makeJob('job-2')]);
    const useCase = new ListJobs({ jobRepository: repo });

    const result = await useCase.execute({ limit: 2 });

    expect(result.jobs).toHaveLength(2);
  });
});
