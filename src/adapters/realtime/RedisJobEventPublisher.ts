import IORedis from 'ioredis';

import { JobEvent, JobEventPublisher } from '../../domain/interfaces/ports/JobEventPublisher';

export class RedisJobEventPublisher implements JobEventPublisher {
  private readonly redis: IORedis;
  private readonly channel: string;

  constructor(redis: IORedis, channel = 'job_events') {
    this.redis = redis;
    this.channel = channel;
  }

  async publish(event: JobEvent): Promise<void> {
    await this.redis.publish(this.channel, JSON.stringify(event));
  }
}
