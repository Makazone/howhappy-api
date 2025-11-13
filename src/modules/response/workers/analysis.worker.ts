import type PgBoss from 'pg-boss';
import { logger } from '@shared/logging/logger.js';
import type { WorkerConfig } from '@worker/shared/types.js';
import { logJobStart, logJobComplete } from '@worker/shared/utils.js';
import { AnalysisService } from '../services/analysis.service.js';

export interface AnalysisRequestPayload {
  responseId: string;
  surveyId: string;
}

const workerLogger = logger.child({ worker: 'analysis' });

async function handleAnalysisRequest(jobs: PgBoss.Job<AnalysisRequestPayload>[]): Promise<void> {
  const [job] = jobs;

  logJobStart(job, { responseId: job.data.responseId, surveyId: job.data.surveyId });

  const analysisService = new AnalysisService();

  try {
    await analysisService.processAnalysis(job.data.responseId);
    logJobComplete(job, { responseId: job.data.responseId });
  } catch (error) {
    workerLogger.error(
      {
        jobId: job.id,
        responseId: job.data.responseId,
        surveyId: job.data.surveyId,
        error,
      },
      'Analysis request failed',
    );
    throw error; // let pg-boss handle retry logic
  }
}

export const analysisWorker: WorkerConfig<AnalysisRequestPayload> = {
  queueName: 'analysis.request',
  handler: handleAnalysisRequest,
  options: {
    batchSize: 1,
  },
};
