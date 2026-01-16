import { Job } from '../domain/entities/Job';
import { JobRepository } from '../domain/interfaces/ports/JobRepository';

export type ListJobsInput = {
  limit: number;
};

export type ListJobsOutput = {
  jobs: Job[];
};

export class ListJobs {
  private readonly jobRepository: JobRepository;

  constructor(deps: { jobRepository: JobRepository }) {
    this.jobRepository = deps.jobRepository;
  }

  async execute(input: ListJobsInput): Promise<ListJobsOutput> {
    const limit = Math.max(1, Math.min(input.limit, 100));
    const jobs = await this.jobRepository.listRecent(limit);
    return { jobs };
  }
}
