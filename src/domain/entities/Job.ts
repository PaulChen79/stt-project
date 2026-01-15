import { JobStatus } from '../value-objects/JobStatus';

export type JobProps = {
  id: string;
  status: JobStatus;
  originalFilename: string;
  audioPath: string;
  transcript: string | null;
  summary: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export class Job {
  public readonly id: string;
  public status: JobStatus;
  public readonly originalFilename: string;
  public readonly audioPath: string;
  public transcript: string | null;
  public summary: string | null;
  public error: string | null;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public readonly expiresAt: Date;

  constructor(props: JobProps) {
    this.id = props.id;
    this.status = props.status;
    this.originalFilename = props.originalFilename;
    this.audioPath = props.audioPath;
    this.transcript = props.transcript;
    this.summary = props.summary;
    this.error = props.error;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.expiresAt = props.expiresAt;
  }

  markProcessing(at: Date): void {
    this.status = 'processing';
    this.updatedAt = at;
  }

  markCompleted(at: Date, transcript: string, summary: string): void {
    this.status = 'completed';
    this.transcript = transcript;
    this.summary = summary;
    this.error = null;
    this.updatedAt = at;
  }

  markFailed(at: Date, error: string): void {
    this.status = 'failed';
    this.error = error;
    this.updatedAt = at;
  }
}
