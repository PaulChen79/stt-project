import { describe, expect, it } from 'vitest';

import { Job } from '../entities/Job';

const baseJob = () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return new Job({
    id: 'job-1',
    status: 'pending',
    originalFilename: 'sample.wav',
    audioPath: '/tmp/sample.wav',
    transcript: null,
    summary: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date('2026-01-08T00:00:00.000Z'),
  });
};

describe('Job', () => {
  it('marks processing', () => {
    const job = baseJob();
    const at = new Date('2026-01-02T00:00:00.000Z');

    job.markProcessing(at);

    expect(job.status).toBe('processing');
    expect(job.updatedAt).toBe(at);
  });

  it('marks completed and sets transcript/summary', () => {
    const job = baseJob();
    const at = new Date('2026-01-03T00:00:00.000Z');

    job.markCompleted(at, 'hello', 'summary');

    expect(job.status).toBe('completed');
    expect(job.transcript).toBe('hello');
    expect(job.summary).toBe('summary');
    expect(job.error).toBeNull();
  });

  it('marks failed with error', () => {
    const job = baseJob();
    const at = new Date('2026-01-04T00:00:00.000Z');

    job.markFailed(at, 'boom');

    expect(job.status).toBe('failed');
    expect(job.error).toBe('boom');
    expect(job.updatedAt).toBe(at);
  });
});
