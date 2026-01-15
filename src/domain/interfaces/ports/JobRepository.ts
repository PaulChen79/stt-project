import { Job } from '../../entities/Job';

export interface JobRepository {
  create(job: Job): Promise<void>;
  getById(id: string): Promise<Job | null>;
  update(job: Job): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  listExpired(now: Date): Promise<Job[]>;
  deleteById(id: string): Promise<void>;
}
