import { SummarizationService } from '../../domain/interfaces/ports/SummarizationService';

type SummarizationConfig = {
  apiKey: string;
  model: string;
};

export class OpenAISummarizationService implements SummarizationService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: SummarizationConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async summarize(input: {
    transcript: string;
    language: string;
  }): Promise<{ summary: string }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Summarize the transcript in the same language as the input. Be concise.',
          },
          {
            role: 'user',
            content: input.transcript,
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`OpenAI API error: ${message}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error('OpenAI API error: empty summary');
    }

    return { summary };
  }
}
