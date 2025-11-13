import { JobStatus } from '@prisma/client';
import { logger } from '@shared/logging/logger.js';
import { AppError } from '@shared/errors/app-error.js';
import { ResponseRepository, responseRepository } from '../repositories/response.repository.js';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
  }>;
}

export class TranscriptionService {
  private logger = logger.child({ service: 'TranscriptionService' });
  private readonly responses: ResponseRepository;

  constructor({ responses = responseRepository }: { responses?: ResponseRepository } = {}) {
    this.responses = responses;
  }

  async processTranscription(responseId: string): Promise<void> {
    this.logger.info({ responseId }, 'Starting transcription processing');

    // Fetch the response
    const response = await this.responses.findById(responseId);

    if (!response) {
      throw new AppError('Response not found', 404);
    }

    if (!response.audioUrl) {
      throw new AppError('No audio URL found for response', 400);
    }

    // Update to PROCESSING
    await this.responses.update(responseId, {
      transcriptionStatus: JobStatus.PROCESSING,
    });

    try {
      // Call transcription service
      const result = await this.transcribeAudio(response.audioUrl);

      // Update with results
      await this.responses.update(responseId, {
        transcription: result.text,
        transcriptionStatus: JobStatus.COMPLETED,
        confidence: result.confidence,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      });

      this.logger.info({ responseId }, 'Transcription completed successfully');
    } catch (error) {
      this.logger.error({ responseId, error }, 'Transcription failed');

      // Mark as failed
      await this.responses.update(responseId, {
        transcriptionStatus: JobStatus.FAILED,
      });

      throw error;
    }
  }

  private async transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
    // TODO: Replace with actual ElevenLabs/Whisper integration
    this.logger.info({ audioUrl }, 'Transcribing audio (stub)');

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      text: 'Looking at our current workflow, there are three main phases that each request goes through. The first phase involves intake and categorization, followed by assignment and execution, and finally review and completion.',
      confidence: 0.95,
      language: 'en',
      duration: 112,
      segments: [
        {
          id: 0,
          start: 0.0,
          end: 5.5,
          text: 'Looking at our current workflow, there are three main phases',
        },
        {
          id: 1,
          start: 5.5,
          end: 10.2,
          text: 'that each request goes through.',
        },
      ],
    };
  }
}

export const transcriptionService = new TranscriptionService();
