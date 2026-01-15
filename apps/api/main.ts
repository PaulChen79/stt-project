import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { BullMQJobQueue } from '../../src/adapters/queue/BullMQJobQueue';
import { LocalFileStorage } from '../../src/adapters/repositories/LocalFileStorage';
import { PostgresJobRepository } from '../../src/adapters/repositories/PostgresJobRepository';
import { CreateJob } from '../../src/usecases/CreateJob';
import { GetJob } from '../../src/usecases/GetJob';
import { loadEnv } from '../../src/infrastructure/config/env';
import { SystemClock } from '../../src/infrastructure/config/systemClock';
import { UuidGenerator } from '../../src/infrastructure/config/uuidGenerator';
import { createPostgresPool } from '../../src/infrastructure/db/postgres';
import { createRedisConnection } from '../../src/infrastructure/redis/redis';

const env = loadEnv();

const pool = createPostgresPool(env.databaseUrl);
const redis = createRedisConnection(env.redisUrl);

const jobRepository = new PostgresJobRepository(pool);
const jobQueue = new BullMQJobQueue({ redis });
const fileStorage = new LocalFileStorage(env.uploadDir);
const clock = new SystemClock();
const idGenerator = new UuidGenerator();

const createJob = new CreateJob({
  clock,
  fileStorage,
  idGenerator,
  jobQueue,
  jobRepository,
  retentionDays: 7,
});
const getJob = new GetJob({ jobRepository });

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
) => {
  res.status(status).json({ error: { code, message } });
};

const isSupportedAudio = (filename: string): boolean => {
  const lower = filename.toLowerCase();
  return lower.endsWith('.wav') || lower.endsWith('.mp3');
};

app.post('/api/jobs', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'MISSING_FILE', 'file is required');
  }

  if (!isSupportedAudio(req.file.originalname)) {
    return sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'only wav/mp3');
  }

  const result = await createJob.execute({
    originalFilename: req.file.originalname,
    buffer: req.file.buffer,
  });

  return res.status(202).json({
    job_id: result.jobId,
    status: result.status,
    created_at: result.createdAt.toISOString(),
  });
});

app.get('/api/jobs/:jobId', async (req, res) => {
  const result = await getJob.execute({ jobId: req.params.jobId });
  if (!result.job) {
    return sendError(res, 404, 'JOB_NOT_FOUND', 'job not found');
  }

  const job = result.job;

  return res.json({
    job_id: job.id,
    status: job.status,
    transcript: job.transcript,
    summary: job.summary,
    error: job.error,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if ('code' in err && err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 413, 'FILE_TOO_LARGE', 'file too large');
  }
  return sendError(res, 500, 'INTERNAL_ERROR', err.message);
});

const server = app.listen(env.port, () => {
  console.log(`api listening on ${env.port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
