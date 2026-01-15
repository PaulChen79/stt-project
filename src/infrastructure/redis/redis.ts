import IORedis from 'ioredis';

export type RedisConnectionOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
};

export const createRedisConnection = (url: string): IORedis => {
  return new IORedis(url);
};

export const parseRedisUrl = (url: string): RedisConnectionOptions => {
  const parsed = new URL(url);
  const db = parsed.pathname.replace('/', '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: db ? Number(db) : undefined,
  };
};
