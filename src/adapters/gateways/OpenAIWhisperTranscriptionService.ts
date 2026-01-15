import { promises as fs } from 'fs';

import { TranscriptionService } from '../../domain/interfaces/ports/TranscriptionService';

type WhisperConfig = {
  apiKey: string;
  model: string;
};

export class OpenAIWhisperTranscriptionService implements TranscriptionService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: WhisperConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async transcribe(input: {
    audioPath: string;
  }): Promise<{ transcript: string; language: string }> {
    const audioBuffer = await fs.readFile(input.audioPath);
    const form = new FormData();
    const blob = new Blob([audioBuffer]);
    form.append('file', blob, 'audio.wav');
    form.append('model', this.model);

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: form,
      },
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Whisper API error: ${message}`);
    }

    const data = (await response.json()) as { text: string };

    return {
      transcript: data.text,
      language: 'auto',
    };
  }
}
