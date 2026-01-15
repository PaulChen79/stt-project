import { Pool } from 'pg';

export const createPostgresPool = (connectionString: string): Pool => {
  return new Pool({ connectionString });
};
