import { logger } from '@shared/logging/logger.js';
import { getEnv } from '@shared/config/env.js';

const llmLogger = logger.child({ module: 'llm' });

export interface AnalysisRequest {
  transcription: string;
  surveyQuestions: unknown;
  metadata?: Record<string, unknown>;
}

export interface AnalysisResponse {
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  summary: string;
  insights: string[];
  scores: Record<string, number>;
}

export class LLMClient {
  private apiKey?: string;
  private model: string;

  constructor() {
    const env = getEnv();
    this.apiKey = env.LLM_API_KEY;
    this.model = env.LLM_MODEL;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    llmLogger.info(
      { transcriptionLength: request.transcription.length, model: this.model },
      'Analyzing transcription (stub)',
    );

    // Stub implementation - returns mocked data
    // Will be replaced with actual API integration in Phase 2
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      sentiment: 'positive',
      keywords: ['happy', 'satisfied', 'excellent', 'recommend'],
      summary: 'This is a mocked analysis summary for development purposes.',
      insights: [
        'Customer expressed high satisfaction',
        'Would recommend the service to others',
        'Found the experience valuable',
      ],
      scores: {
        satisfaction: 0.85,
        likelihood_to_recommend: 0.9,
        clarity: 0.8,
      },
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

let llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}
