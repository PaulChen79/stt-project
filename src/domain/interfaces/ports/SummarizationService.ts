export interface SummarizationService {
  summarize(input: {
    transcript: string;
    language: string;
  }): Promise<{ summary: string }>;
}
