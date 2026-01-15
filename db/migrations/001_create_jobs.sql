CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  original_filename text NOT NULL,
  audio_path text NOT NULL,
  transcript text,
  summary text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs (expires_at);
