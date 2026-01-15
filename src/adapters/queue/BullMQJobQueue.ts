import { Queue } from 'bullmq';

import { JobQueue } from '../../domain/interfaces/ports/JobQueue';
import { RedisConnectionOptions } from '../../infrastructure/redis/redis';

type BullMQJobQueueConfig = {
  connection: RedisConnectionOptions;
  queueName?: string;
};

export class BullMQJobQueue implements JobQueue {
  private readonly queue: Queue;

  constructor(config: BullMQJobQueueConfig) {
    this.queue = new Queue(config.queueName ?? 'stt_jobs', {
      connection: config.connection,
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
