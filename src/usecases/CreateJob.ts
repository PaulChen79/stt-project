import { Job } from '../domain/entities/Job';
import { Clock } from '../domain/interfaces/ports/Clock';
import { FileStorage } from '../domain/interfaces/ports/FileStorage';
import { IdGenerator } from '../domain/interfaces/ports/IdGenerator';
import { JobQueue } from '../domain/interfaces/ports/JobQueue';
import { JobRepository } from '../domain/interfaces/ports/JobRepository';

export type CreateJobInput = {
  originalFilename: string;
  buffer: Buffer;
};

export type CreateJobOutput = {
  jobId: string;
  status: 'processing';
  createdAt: Date;
};

export class CreateJob {
  private readonly clock: Clock;
  private readonly fileStorage: FileStorage;
  private readonly idGenerator: IdGenerator;
  private readonly jobQueue: JobQueue;
  private readonly jobRepository: JobRepository;
  private readonly retentionDays: number;

  constructor(deps: {
    clock: Clock;
    fileStorage: FileStorage;
    idGenerator: IdGenerator;
    jobQueue: JobQueue;
    jobRepository: JobRepository;
    retentionDays: number;
  }) {
    this.clock = deps.clock;
    this.fileStorage = deps.fileStorage;
    this.idGenerator = deps.idGenerator;
    this.jobQueue = deps.jobQueue;
    this.jobRepository = deps.jobRepository;
    this.retentionDays = deps.retentionDays;
  }

  async execute(input: CreateJobInput): Promise<CreateJobOutput> {
    const now = this.clock.now();
    const jobId = this.idGenerator.generate();
    const saved = await this.fileStorage.save({
      jobId,
      originalFilename: input.originalFilename,
      buffer: input.buffer,
    });

    const expiresAt = new Date(
      now.getTime() + this.retentionDays * 24 * 60 * 60 * 1000,
    );

    const job = new Job({
      id: jobId,
      status: 'processing',
      originalFilename: input.originalFilename,
      audioPath: saved.path,
      transcript: null,
      summary: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    await this.jobRepository.create(job);
    await this.jobQueue.enqueue({ jobId, audioPath: saved.path });

    return { jobId, status: 'processing', createdAt: now };
  }
}
