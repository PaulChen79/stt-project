import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { WebSocket, WebSocketServer } from 'ws';

import { BullMQJobQueue } from '../../src/adapters/queue/BullMQJobQueue';
import { LocalFileStorage } from '../../src/adapters/repositories/LocalFileStorage';
import { PostgresJobRepository } from '../../src/adapters/repositories/PostgresJobRepository';
import { CreateJob } from '../../src/usecases/CreateJob';
import { GetJob } from '../../src/usecases/GetJob';
import { loadEnv } from '../../src/infrastructure/config/env';
import { SystemClock } from '../../src/infrastructure/config/systemClock';
import { UuidGenerator } from '../../src/infrastructure/config/uuidGenerator';
import { createPostgresPool } from '../../src/infrastructure/db/postgres';
import {
  createRedisConnection,
  parseRedisUrl,
} from '../../src/infrastructure/redis/redis';

const env = loadEnv();

const pool = createPostgresPool(env.databaseUrl);
const redis = createRedisConnection(env.redisUrl);
const subscriber = redis.duplicate();

const jobRepository = new PostgresJobRepository(pool);
const jobQueue = new BullMQJobQueue({ connection: parseRedisUrl(env.redisUrl) });
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

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

const wss = new WebSocketServer({ server, path: '/ws' });
const subscriptions = new Map<WebSocket, Set<string>>();

const sendWs = (ws: WebSocket, payload: Record<string, unknown>) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const sendStatusSnapshot = async (ws: WebSocket, jobId: string) => {
  const result = await getJob.execute({ jobId });
  if (!result.job) {
    sendWs(ws, { type: 'error', job_id: jobId, error: 'job not found' });
    return;
  }

  const job = result.job;
  sendWs(ws, { type: 'status', job_id: job.id, status: job.status });
  if (job.status === 'completed') {
    sendWs(ws, {
      type: 'result',
      job_id: job.id,
      transcript: job.transcript,
      summary: job.summary,
    });
  }
  if (job.status === 'failed') {
    sendWs(ws, { type: 'error', job_id: job.id, error: job.error });
  }
};

wss.on('connection', (ws) => {
  subscriptions.set(ws, new Set());

  ws.on('message', (data) => {
    try {
      const payload = JSON.parse(data.toString()) as {
        type?: string;
        job_id?: string;
      };
      if (payload.type !== 'subscribe' || !payload.job_id) {
        sendWs(ws, { type: 'error', error: 'invalid message' });
        return;
      }
      const set = subscriptions.get(ws);
      if (set) {
        set.add(payload.job_id);
      }
      void sendStatusSnapshot(ws, payload.job_id);
    } catch {
      sendWs(ws, { type: 'error', error: 'invalid json' });
    }
  });

  ws.on('close', () => {
    subscriptions.delete(ws);
  });
});

subscriber.subscribe('job_events');
subscriber.on('message', (_channel, message) => {
  try {
    const event = JSON.parse(message) as {
      type: string;
      jobId: string;
      status?: string;
      stage?: string;
      message?: string;
      transcript?: string;
      summary?: string;
      error?: string;
    };

    const payload = (() => {
      switch (event.type) {
        case 'status':
          return { type: 'status', job_id: event.jobId, status: event.status };
        case 'progress':
          return {
            type: 'progress',
            job_id: event.jobId,
            stage: event.stage,
            message: event.message,
          };
        case 'result':
          return {
            type: 'result',
            job_id: event.jobId,
            transcript: event.transcript,
            summary: event.summary,
          };
        case 'error':
          return { type: 'error', job_id: event.jobId, error: event.error };
        default:
          return null;
      }
    })();

    if (!payload || !event.jobId) {
      return;
    }

    for (const [ws, jobs] of subscriptions.entries()) {
      if (jobs.has(event.jobId)) {
        sendWs(ws, payload);
      }
    }
  } catch {
    return;
  }
});

const shutdown = async () => {
  server.close();
  await subscriber.quit();
  await pool.end();
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
