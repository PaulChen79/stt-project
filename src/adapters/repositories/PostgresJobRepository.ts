import { Pool } from 'pg';

import { Job } from '../../domain/entities/Job';
import { JobRepository } from '../../domain/interfaces/ports/JobRepository';

type JobRow = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_filename: string;
  audio_path: string;
  transcript: string | null;
  summary: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

const mapRowToJob = (row: JobRow): Job => {
  return new Job({
    id: row.id,
    status: row.status,
    originalFilename: row.original_filename,
    audioPath: row.audio_path,
    transcript: row.transcript,
    summary: row.summary,
    error: row.error,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: new Date(row.expires_at),
  });
};

export class PostgresJobRepository implements JobRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(job: Job): Promise<void> {
    await this.pool.query(
      `INSERT INTO jobs (
        id,
        status,
        original_filename,
        audio_path,
        transcript,
        summary,
        error,
        created_at,
        updated_at,
        expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        job.id,
        job.status,
        job.originalFilename,
        job.audioPath,
        job.transcript,
        job.summary,
        job.error,
        job.createdAt,
        job.updatedAt,
        job.expiresAt,
      ],
    );
  }

  async getById(id: string): Promise<Job | null> {
    const result = await this.pool.query<JobRow>(
      'SELECT * FROM jobs WHERE id = $1',
      [id],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return mapRowToJob(result.rows[0]);
  }

  async listRecent(limit: number): Promise<Job[]> {
    const result = await this.pool.query<JobRow>(
      'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    return result.rows.map(mapRowToJob);
  }

  async update(job: Job): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
        SET status = $1,
            transcript = $2,
            summary = $3,
            error = $4,
            updated_at = $5
        WHERE id = $6`,
      [
        job.status,
        job.transcript,
        job.summary,
        job.error,
        job.updatedAt,
        job.id,
      ],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE jobs
        SET status = 'failed',
            error = $1,
            updated_at = now()
        WHERE id = $2`,
      [error, id],
    );
  }

  async listExpired(now: Date): Promise<Job[]> {
    const result = await this.pool.query<JobRow>(
      'SELECT * FROM jobs WHERE expires_at < $1',
      [now],
    );
    return result.rows.map(mapRowToJob);
  }

  async deleteById(id: string): Promise<void> {
    await this.pool.query('DELETE FROM jobs WHERE id = $1', [id]);
  }
}
