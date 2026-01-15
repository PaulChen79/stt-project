import { Queue, QueueScheduler, Worker } from 'bullmq';

import { OpenAISummarizationService } from '../../src/adapters/gateways/OpenAISummarizationService';
import { OpenAIWhisperTranscriptionService } from '../../src/adapters/gateways/OpenAIWhisperTranscriptionService';
import { RedisJobEventPublisher } from '../../src/adapters/realtime/RedisJobEventPublisher';
import { LocalFileStorage } from '../../src/adapters/repositories/LocalFileStorage';
import { PostgresJobRepository } from '../../src/adapters/repositories/PostgresJobRepository';
import { CleanupExpiredJobs } from '../../src/usecases/CleanupExpiredJobs';
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
const fileStorage = new LocalFileStorage(env.uploadDir);
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
const cleanupJobs = new CleanupExpiredJobs({
  clock,
  fileStorage,
  jobRepository,
});

const queueName = 'stt_jobs';
const dlqName = 'stt_jobs_dlq';
const cleanupQueueName = 'cleanup_jobs';

const scheduler = new QueueScheduler(queueName, { connection: redis });
const cleanupScheduler = new QueueScheduler(cleanupQueueName, {
  connection: redis,
});
const dlq = new Queue(dlqName, { connection: redis });
const cleanupQueue = new Queue(cleanupQueueName, { connection: redis });

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

const cleanupWorker = new Worker(
  cleanupQueueName,
  async () => {
    await cleanupJobs.execute();
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

const start = async () => {
  await cleanupQueue.add(
    'cleanup',
    {},
    {
      jobId: 'daily-cleanup',
      repeat: { every: 24 * 60 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log('worker started');
};

const shutdown = async () => {
  await worker.close();
  await cleanupWorker.close();
  await scheduler.close();
  await cleanupScheduler.close();
  await cleanupQueue.close();
  await dlq.close();
  await redis.quit();
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();
