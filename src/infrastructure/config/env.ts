export type Env = {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  openAiApiKey: string;
  openAiModel: string;
  whisperApiKey: string;
  whisperModel: string;
  uploadDir: string;
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

export const loadEnv = (): Env => {
  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: requireEnv('DATABASE_URL'),
    redisUrl: requireEnv('REDIS_URL'),
    openAiApiKey: requireEnv('OPENAI_API_KEY'),
    openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4',
    whisperApiKey: requireEnv('WHISPER_API_KEY'),
    whisperModel: process.env.WHISPER_MODEL ?? 'whisper-1',
    uploadDir: process.env.UPLOAD_DIR ?? '/app/uploads',
  };
};
