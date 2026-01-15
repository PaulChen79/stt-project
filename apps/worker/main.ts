import { Queue, QueueScheduler, Worker } from 'bullmq';

import { OpenAISummarizationService } from '../../src/adapters/gateways/OpenAISummarizationService';
import { OpenAIWhisperTranscriptionService } from '../../src/adapters/gateways/OpenAIWhisperTranscriptionService';
import { RedisJobEventPublisher } from '../../src/adapters/realtime/RedisJobEventPublisher';
import { PostgresJobRepository } from '../../src/adapters/repositories/PostgresJobRepository';
import { ProcessJob } from '../../src/usecases/ProcessJob';
import { loadEnv } from '../../src/infrastructure/config/env';
import { SystemClock } from '../../src/infrastructure/config/systemClock';
import { createPostgresPool } from '../../src/infrastructure/db/postgres';
import { createRedisConnection } from '../../src/infrastructure/redis/redis';

const env = loadEnv();

const redis = createRedisConnection(env.redisUrl);
const pool = createPostgresPool(env.databaseUrl);

const jobRepository = new PostgresJobRepository(pool);
const jobEvents = new RedisJobEventPublisher(redis);
const clock = new SystemClock();
const transcriptionService = new OpenAIWhisperTranscriptionService({
  apiKey: env.whisperApiKey,
  model: env.whisperModel,
});
const summarizationService = new OpenAISummarizationService({
  apiKey: env.openAiApiKey,
  model: env.openAiModel,
});

const processJob = new ProcessJob({
  clock,
  jobEvents,
  jobRepository,
  summarizationService,
  transcriptionService,
});

const queueName = 'stt_jobs';
const dlqName = 'stt_jobs_dlq';

const scheduler = new QueueScheduler(queueName, { connection: redis });
const dlq = new Queue(dlqName, { connection: redis });

const worker = new Worker(
  queueName,
  async (job) => {
    const attempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= attempts;
    await processJob.execute({
      jobId: job.data.jobId,
      markFailedOnError: isFinalAttempt,
    });
  },
  { connection: redis },
);

worker.on('failed', async (job, error) => {
  if (!job) {
    return;
  }
  const attempts = job.opts.attempts ?? 1;
  if (job.attemptsMade >= attempts) {
    await dlq.add('dead-letter', {
      jobId: job.data.jobId,
      error: error?.message ?? 'Unknown error',
    });
  }
});

console.log('worker started');

const shutdown = async () => {
  await worker.close();
  await scheduler.close();
  await dlq.close();
  await redis.quit();
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
