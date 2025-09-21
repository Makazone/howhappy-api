import { buildApp } from './app.js';
import { logger } from '@shared/logging/logger.js';
import { connectDatabase, disconnectDatabase } from '@infrastructure/database/client.js';
import { initQueueProducer, shutdownQueueProducer } from '@infrastructure/queue/producer.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await initQueueProducer({ max: 2 });

    const app = buildApp();

    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Received shutdown signal');

      server.close(() => {
        logger.info('HTTP server closed');
      });

      await shutdownQueueProducer();
      await disconnectDatabase();

      process.exit(0);
    };

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    await shutdownQueueProducer().catch(() => {
      // ignore shutdown errors during boot failure
    });
    await disconnectDatabase().catch(() => {
      // ignore
    });
    process.exit(1);
  }
}

void startServer();
