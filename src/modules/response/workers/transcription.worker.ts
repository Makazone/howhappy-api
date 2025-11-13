import type PgBoss from 'pg-boss';
import { logger } from '@shared/logging/logger.js';
import type { WorkerConfig } from '@worker/shared/types.js';
import { logJobStart, logJobComplete } from '@worker/shared/utils.js';
import { TranscriptionService } from '../services/transcription.service.js';

export interface TranscriptionRequestPayload {
  responseId: string;
  surveyId: string;
}

const workerLogger = logger.child({ worker: 'transcription' });

async function handleTranscriptionRequest(
  jobs: PgBoss.Job<TranscriptionRequestPayload>[],
): Promise<void> {
  const [job] = jobs;

  logJobStart(job, { responseId: job.data.responseId, surveyId: job.data.surveyId });

  const transcriptionService = new TranscriptionService();

  try {
    await transcriptionService.processTranscription(job.data.responseId);
    logJobComplete(job, { responseId: job.data.responseId });
  } catch (error) {
    workerLogger.error(
      {
        jobId: job.id,
        responseId: job.data.responseId,
        surveyId: job.data.surveyId,
        error,
      },
      'Transcription request failed',
    );
    throw error; // let pg-boss handle retry logic
  }
}

export const transcriptionWorker: WorkerConfig<TranscriptionRequestPayload> = {
  queueName: 'transcription.request',
  handler: handleTranscriptionRequest,
  options: {
    batchSize: 1,
  },
};
