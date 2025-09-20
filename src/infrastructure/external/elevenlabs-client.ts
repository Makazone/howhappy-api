import { logger } from '@shared/logging/logger.js';
import { getEnv } from '@shared/config/env.js';

const elevenLabsLogger = logger.child({ module: 'elevenlabs' });

export interface TranscriptionRequest {
  audioUrl: string;
  language?: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence?: number;
  duration?: number;
}

export class ElevenLabsClient {
  private apiKey?: string;

  constructor() {
    const env = getEnv();
    this.apiKey = env.ELEVENLABS_API_KEY;
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    elevenLabsLogger.info({ audioUrl: request.audioUrl }, 'Transcribing audio (stub)');

    // Stub implementation - returns mocked data
    // Will be replaced with actual API integration in Phase 2
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      text: 'This is a mocked transcription for development. Actual implementation pending.',
      confidence: 0.95,
      duration: 30,
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

let elevenLabsClient: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (!elevenLabsClient) {
    elevenLabsClient = new ElevenLabsClient();
  }
  return elevenLabsClient;
}
