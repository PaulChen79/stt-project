export const jobStatusValues = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type JobStatus = (typeof jobStatusValues)[number];

export const isJobStatus = (value: string): value is JobStatus => {
  return (jobStatusValues as readonly string[]).includes(value);
};
