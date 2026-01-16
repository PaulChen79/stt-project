import { describe, expect, it } from 'vitest';

import { Job } from '../entities/Job';
import { CreateJob } from '../../usecases/CreateJob';
import { Clock } from '../interfaces/ports/Clock';
import { FileStorage } from '../interfaces/ports/FileStorage';
import { IdGenerator } from '../interfaces/ports/IdGenerator';
import { JobQueue } from '../interfaces/ports/JobQueue';
import { JobRepository } from '../interfaces/ports/JobRepository';

const fixedNow = new Date('2026-01-01T00:00:00.000Z');

class FixedClock implements Clock {
  now(): Date {
    return fixedNow;
  }
}

class FakeFileStorage implements FileStorage {
  public saved: { jobId: string; originalFilename: string; buffer: Buffer } | null =
    null;
  async save(input: {
    jobId: string;
    originalFilename: string;
    buffer: Buffer;
  }): Promise<{ path: string; sizeBytes: number }> {
    this.saved = input;
    return { path: `/tmp/${input.jobId}.wav`, sizeBytes: input.buffer.length };
  }
  async delete(): Promise<void> {}
  async exists(): Promise<boolean> {
    return false;
  }
}

class FixedIdGenerator implements IdGenerator {
  generate(): string {
    return 'job-123';
  }
}

class FakeQueue implements JobQueue {
  public enqueued: { jobId: string; audioPath: string } | null = null;
  async enqueue(job: { jobId: string; audioPath: string }): Promise<void> {
    this.enqueued = job;
  }
}

class FakeRepo implements JobRepository {
  public created: Job | null = null;
  async create(job: Job): Promise<void> {
    this.created = job;
  }
  async getById(): Promise<Job | null> {
    return null;
  }
  async update(): Promise<void> {}
  async markFailed(): Promise<void> {}
  async listExpired(): Promise<Job[]> {
    return [];
  }
  async deleteById(): Promise<void> {}
}

describe('CreateJob', () => {
  it('creates pending job and enqueues', async () => {
    const clock = new FixedClock();
    const fileStorage = new FakeFileStorage();
    const idGenerator = new FixedIdGenerator();
    const jobQueue = new FakeQueue();
    const jobRepository = new FakeRepo();

    const useCase = new CreateJob({
      clock,
      fileStorage,
      idGenerator,
      jobQueue,
      jobRepository,
      retentionDays: 7,
    });

    const output = await useCase.execute({
      originalFilename: 'sample.wav',
      buffer: Buffer.from('data'),
    });

    expect(output.jobId).toBe('job-123');
    expect(output.status).toBe('processing');
    expect(output.createdAt).toBe(fixedNow);
    expect(jobRepository.created?.status).toBe('processing');
    expect(jobRepository.created?.audioPath).toBe('/tmp/job-123.wav');
    expect(jobQueue.enqueued).toEqual({
      jobId: 'job-123',
      audioPath: '/tmp/job-123.wav',
    });
  });
});
