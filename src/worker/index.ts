import { createBoss, stopBoss } from '@app/bootstrap/boss.js';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/client.js';
import { logger } from '@shared/logging/logger.js';
import type PgBoss from 'pg-boss';

const workerLogger = logger.child({ module: 'worker' });

type JobHandler<T = any> = (job: PgBoss.Job<T>) => Promise<void>;

const jobHandlers: Record<string, JobHandler> = {
  'transcription.request': async (job) => {
    workerLogger.info({ jobId: job.id, data: job.data }, 'Processing transcription request');
    // Stub handler - will be implemented in Phase 2
    await new Promise((resolve) => setTimeout(resolve, 100));
    workerLogger.info({ jobId: job.id }, 'Transcription request completed');
  },

  'analysis.request': async (job) => {
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
