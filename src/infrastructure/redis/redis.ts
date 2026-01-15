import IORedis from 'ioredis';

export const createRedisConnection = (url: string): IORedis => {
  return new IORedis(url);
};
