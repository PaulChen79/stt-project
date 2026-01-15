import { Clock } from '../domain/interfaces/ports/Clock';
import { FileStorage } from '../domain/interfaces/ports/FileStorage';
import { JobRepository } from '../domain/interfaces/ports/JobRepository';

export type CleanupExpiredJobsOutput = {
  deleted: number;
};

export class CleanupExpiredJobs {
  private readonly clock: Clock;
  private readonly fileStorage: FileStorage;
  private readonly jobRepository: JobRepository;

  constructor(deps: {
    clock: Clock;
    fileStorage: FileStorage;
    jobRepository: JobRepository;
  }) {
    this.clock = deps.clock;
    this.fileStorage = deps.fileStorage;
    this.jobRepository = deps.jobRepository;
  }

  async execute(): Promise<CleanupExpiredJobsOutput> {
    const now = this.clock.now();
    const expired = await this.jobRepository.listExpired(now);

    for (const job of expired) {
      const exists = await this.fileStorage.exists(job.audioPath);
      if (exists) {
        await this.fileStorage.delete(job.audioPath);
      }
      await this.jobRepository.deleteById(job.id);
    }

    return { deleted: expired.length };
  }
}
