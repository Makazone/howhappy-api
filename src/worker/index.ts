import { createBoss, stopBoss } from '@app/bootstrap/boss.js';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/client.js';
import { logger } from '@shared/logging/logger.js';
import { transcriptionWorker, analysisWorker } from '@modules/response/workers/index.js';
import type { WorkerConfig } from './shared/types.js';
import type PgBoss from 'pg-boss';

const workerLogger = logger.child({ module: 'worker' });

// Register all workers from modules
const WORKERS: WorkerConfig[] = [transcriptionWorker, analysisWorker];

async function startWorker(): Promise<void> {
  let boss: PgBoss | null = null;

  try {
    await connectDatabase();
    workerLogger.info('Database connected');

    boss = await createBoss();
    workerLogger.info('Queue manager initialized');

    // Register all workers
    for (const worker of WORKERS) {
      await boss.work(worker.queueName, worker.options || {}, worker.handler);
      workerLogger.info(
        { queue: worker.queueName, options: worker.options },
        'Worker subscribed to queue',
      );
    }

    workerLogger.info('All workers registered successfully');

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
