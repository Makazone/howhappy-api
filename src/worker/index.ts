import { createBoss, stopBoss } from '@app/bootstrap/boss.js';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/client.js';
import { logger } from '@shared/logging/logger.js';
import { prisma } from '@infrastructure/database/client.js';
import { JobStatus } from '@prisma/client';
import type PgBoss from 'pg-boss';

const workerLogger = logger.child({ module: 'worker' });

type JobHandler<T = any> = (job: PgBoss.Job<T>[]) => Promise<void>;

interface TranscriptionRequestPayload {
  responseId: string;
  surveyId: string;
}

const jobHandlers: Record<string, JobHandler> = {
  'transcription.request': async ([job]: PgBoss.Job<TranscriptionRequestPayload>[]) => {
    workerLogger.info({ jobId: job.id, data: job.data }, 'Processing transcription request!');

    const { responseId } = job.data;

    workerLogger.info('Response ID');

    try {
      // Update status to PROCESSING
      await prisma.surveyResponse.update({
        where: { id: responseId },
        data: { transcriptionStatus: JobStatus.PROCESSING },
      });

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stubbed transcription data - in real implementation, this would call OpenAI Whisper
      const stubbedTranscription = {
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

      // Update response with transcription results
      await prisma.surveyResponse.update({
        where: { id: responseId },
        data: {
          transcription: stubbedTranscription.text,
          transcriptionStatus: JobStatus.COMPLETED,
          confidence: stubbedTranscription.confidence,
          language: stubbedTranscription.language,
          duration: stubbedTranscription.duration,
          segments: stubbedTranscription.segments,
        },
      });

      workerLogger.info({ jobId: job.id, responseId }, 'Transcription request completed');
    } catch (error) {
      workerLogger.error({ jobId: job.id, responseId, error }, 'Transcription request failed');

      // Update status to FAILED
      await prisma.surveyResponse.update({
        where: { id: responseId },
        data: { transcriptionStatus: JobStatus.FAILED },
      });

      throw error;
    }
  },

  'analysis.request': async ([job]) => {
    workerLogger.info({ jobId: job.id, data: job.data }, 'Processing analysis request');
    // Stub handler - will be implemented in Phase 2
    await new Promise((resolve) => setTimeout(resolve, 100));
    workerLogger.info({ jobId: job.id }, 'Analysis request completed');
  },
};

async function startWorker(): Promise<void> {
  let boss: PgBoss | null = null;

  try {
    await connectDatabase();

    boss = await createBoss();

    for (const [queueName, handler] of Object.entries(jobHandlers)) {
      await boss.work(queueName, handler as any);
      workerLogger.info({ queue: queueName }, 'Worker subscribed to queue');
    }

    workerLogger.info('Worker started successfully');

    const gracefulShutdown = async (signal: string): Promise<void> => {
      workerLogger.info({ signal }, 'Received shutdown signal');

      if (boss) {
        await stopBoss(boss);
      }

      await disconnectDatabase();

      process.exit(0);
    };

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  } catch (error) {
    workerLogger.error({ error }, 'Failed to start worker');

    if (boss) {
      await stopBoss(boss);
    }

    await disconnectDatabase();
    process.exit(1);
  }
}

void startWorker();
