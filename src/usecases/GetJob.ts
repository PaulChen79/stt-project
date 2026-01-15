import { Job } from '../domain/entities/Job';
import { JobRepository } from '../domain/interfaces/ports/JobRepository';

export type GetJobInput = {
  jobId: string;
};

export type GetJobOutput = {
  job: Job | null;
};

export class GetJob {
  private readonly jobRepository: JobRepository;

  constructor(deps: { jobRepository: JobRepository }) {
    this.jobRepository = deps.jobRepository;
  }

  async execute(input: GetJobInput): Promise<GetJobOutput> {
    const job = await this.jobRepository.getById(input.jobId);
    return { job };
  }
}
