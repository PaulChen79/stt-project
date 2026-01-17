import { Clock } from '../domain/interfaces/ports/Clock';
import { JobEventPublisher } from '../domain/interfaces/ports/JobEventPublisher';
import { JobRepository } from '../domain/interfaces/ports/JobRepository';
import { SummarizationService } from '../domain/interfaces/ports/SummarizationService';
import { TranscriptionService } from '../domain/interfaces/ports/TranscriptionService';

export type ProcessJobInput = {
  jobId: string;
  markFailedOnError?: boolean;
};

export class ProcessJob {
  private readonly clock: Clock;
  private readonly jobEvents: JobEventPublisher;
  private readonly jobRepository: JobRepository;
  private readonly summarizationService: SummarizationService;
  private readonly transcriptionService: TranscriptionService;

  constructor(deps: {
    clock: Clock;
    jobEvents: JobEventPublisher;
    jobRepository: JobRepository;
    summarizationService: SummarizationService;
    transcriptionService: TranscriptionService;
  }) {
    this.clock = deps.clock;
    this.jobEvents = deps.jobEvents;
    this.jobRepository = deps.jobRepository;
    this.summarizationService = deps.summarizationService;
    this.transcriptionService = deps.transcriptionService;
  }

  async execute(input: ProcessJobInput): Promise<void> {
    const job = await this.jobRepository.getById(input.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    job.markProcessing(this.clock.now());
    await this.jobRepository.update(job);
    await this.jobEvents.publish({
      type: 'status',
      jobId: job.id,
      status: 'processing',
    });

    try {
      await this.jobEvents.publish({
        type: 'progress',
        jobId: job.id,
        stage: 'transcribing',
        message: 'Transcribing audio',
      });
      const transcription = await this.transcriptionService.transcribe({
        audioPath: job.audioPath,
      });

      await this.jobEvents.publish({
        type: 'progress',
        jobId: job.id,
        stage: 'summarizing',
        message: 'Summarizing transcript',
      });
      const summary = await this.summarizationService.summarize({
        transcript: transcription.transcript,
        language: transcription.language,
      });

      job.markCompleted(
        this.clock.now(),
        transcription.transcript,
        summary.summary,
      );
      await this.jobRepository.update(job);
      await this.jobEvents.publish({
        type: 'status',
        jobId: job.id,
        status: 'completed',
      });
      await this.jobEvents.publish({
        type: 'result',
        jobId: job.id,
        transcript: transcription.transcript,
        summary: summary.summary,
      });
      await this.jobEvents.publish({
        type: 'progress',
        jobId: job.id,
        stage: 'summarizing',
        message: 'Summarizing done',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (input.markFailedOnError ?? true) {
        job.markFailed(this.clock.now(), message);
        await this.jobRepository.update(job);
        await this.jobEvents.publish({
          type: 'status',
          jobId: job.id,
          status: 'failed',
        });
        await this.jobEvents.publish({
          type: 'error',
          jobId: job.id,
          error: message,
        });
      }
      throw error;
    }
  }
}
