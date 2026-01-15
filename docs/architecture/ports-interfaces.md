# Ports / Interfaces 設計

以下為 Clean Architecture 的 domain ports 建議介面，放在 `src/domain/interfaces/ports/`。

## JobRepository
```ts
import { Job } from "../../entities/Job";

export interface JobRepository {
  create(job: Job): Promise<void>;
  getById(id: string): Promise<Job | null>;
  update(job: Job): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  listExpired(now: Date): Promise<Job[]>;
  deleteById(id: string): Promise<void>;
}
```

## FileStorage
```ts
export interface FileStorage {
  save(input: {
    jobId: string;
    originalFilename: string;
    buffer: Buffer;
  }): Promise<{ path: string; sizeBytes: number }>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

## TranscriptionService
```ts
export interface TranscriptionService {
  transcribe(input: { audioPath: string }): Promise<{
    transcript: string;
    language: string;
  }>;
}
```

## SummarizationService
```ts
export interface SummarizationService {
  summarize(input: {
    transcript: string;
    language: string;
  }): Promise<{ summary: string }>;
}
```

## JobQueue
```ts
export interface JobQueue {
  enqueue(job: { jobId: string; audioPath: string }): Promise<void>;
}
```

## JobEventPublisher
```ts
export type JobEvent =
  | { type: "status"; jobId: string; status: "pending" | "processing" | "completed" | "failed" }
  | { type: "progress"; jobId: string; stage: "transcribing" | "summarizing"; message: string }
  | { type: "result"; jobId: string; transcript: string; summary: string }
  | { type: "error"; jobId: string; error: string };

export interface JobEventPublisher {
  publish(event: JobEvent): Promise<void>;
}
```

## Clock / IdGenerator
```ts
export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}
```
