import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { JobQueue } from '../../domain/interfaces/ports/JobQueue';

type BullMQJobQueueConfig = {
  redis: IORedis;
  queueName?: string;
};

export class BullMQJobQueue implements JobQueue {
  private readonly queue: Queue;

  constructor(config: BullMQJobQueueConfig) {
    this.queue = new Queue(config.queueName ?? 'stt_jobs', {
      connection: config.redis,
    });
  }

  async enqueue(job: { jobId: string; audioPath: string }): Promise<void> {
    await this.queue.add('process-job', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
