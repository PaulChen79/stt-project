export type JobEvent =
  | {
      type: 'status';
      jobId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
    }
  | {
      type: 'progress';
      jobId: string;
      stage: 'transcribing' | 'summarizing';
      message: string;
    }
  | {
      type: 'result';
      jobId: string;
      transcript: string;
      summary: string;
    }
  | {
      type: 'error';
      jobId: string;
      error: string;
    };

export interface JobEventPublisher {
  publish(event: JobEvent): Promise<void>;
}
