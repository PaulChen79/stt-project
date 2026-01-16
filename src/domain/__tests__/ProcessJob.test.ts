import { describe, expect, it } from 'vitest';

import { Job } from '../entities/Job';
import { ProcessJob } from '../../usecases/ProcessJob';
import { Clock } from '../interfaces/ports/Clock';
import { JobEvent, JobEventPublisher } from '../interfaces/ports/JobEventPublisher';
import { JobRepository } from '../interfaces/ports/JobRepository';
import { SummarizationService } from '../interfaces/ports/SummarizationService';
import { TranscriptionService } from '../interfaces/ports/TranscriptionService';

class FixedClock implements Clock {
  private readonly nowValue = new Date('2026-01-02T00:00:00.000Z');
  now(): Date {
    return this.nowValue;
  }
}

class InMemoryRepo implements JobRepository {
  public job: Job | null;
  constructor(job: Job | null) {
    this.job = job;
  }
  async create(): Promise<void> {}
  async getById(): Promise<Job | null> {
    return this.job;
  }
  async listRecent(): Promise<Job[]> {
    return [];
  }
  async update(job: Job): Promise<void> {
    this.job = job;
  }
  async markFailed(): Promise<void> {}
  async listExpired(): Promise<Job[]> {
    return [];
  }
  async deleteById(): Promise<void> {}
}

class FakeEvents implements JobEventPublisher {
  public events: JobEvent[] = [];
  async publish(event: JobEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeTranscription implements TranscriptionService {
  async transcribe(): Promise<{ transcript: string; language: string }> {
    return { transcript: 'hello', language: 'en' };
  }
}

class FakeSummary implements SummarizationService {
  async summarize(): Promise<{ summary: string }> {
    return { summary: 'sum' };
  }
}

describe('ProcessJob', () => {
  it('processes job successfully', async () => {
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

    const repo = new InMemoryRepo(job);
    const events = new FakeEvents();
    const useCase = new ProcessJob({
      clock: new FixedClock(),
      jobEvents: events,
      jobRepository: repo,
      summarizationService: new FakeSummary(),
      transcriptionService: new FakeTranscription(),
    });

    await useCase.execute({ jobId: 'job-1' });

    expect(repo.job?.status).toBe('completed');
    expect(repo.job?.transcript).toBe('hello');
    expect(repo.job?.summary).toBe('sum');
    expect(events.events.some((event) => event.type === 'result')).toBe(true);
  });

  it('marks failed and throws on error', async () => {
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

    class FailingTranscription implements TranscriptionService {
      async transcribe(): Promise<{ transcript: string; language: string }> {
        throw new Error('fail');
      }
    }

    const repo = new InMemoryRepo(job);
    const events = new FakeEvents();
    const useCase = new ProcessJob({
      clock: new FixedClock(),
      jobEvents: events,
      jobRepository: repo,
      summarizationService: new FakeSummary(),
      transcriptionService: new FailingTranscription(),
    });

    await expect(useCase.execute({ jobId: 'job-1' })).rejects.toThrow('fail');
    expect(repo.job?.status).toBe('failed');
    expect(events.events.some((event) => event.type === 'error')).toBe(true);
  });
});
