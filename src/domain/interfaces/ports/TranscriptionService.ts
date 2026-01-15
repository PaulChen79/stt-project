export interface TranscriptionService {
  transcribe(input: { audioPath: string }): Promise<{
    transcript: string;
    language: string;
  }>;
}
