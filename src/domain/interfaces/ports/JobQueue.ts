export interface JobQueue {
  enqueue(job: { jobId: string; audioPath: string }): Promise<void>;
}
