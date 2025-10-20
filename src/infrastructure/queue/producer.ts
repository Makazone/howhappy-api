import PgBoss from 'pg-boss';
import { createBoss, stopBoss, type BossConfig } from '@app/bootstrap/boss.js';

let producerInstance: PgBoss | null = null;
let initializing: Promise<PgBoss> | null = null;

export async function initQueueProducer(config: BossConfig = {}): Promise<PgBoss> {
  if (producerInstance) {
    return producerInstance;
  }
  if (!initializing) {
    initializing = createBoss({
      ...config,
      max: config.max ?? 5,
    }).then(async (boss) => {
      await boss.createQueue('transcription.request');
      await boss.createQueue('analysis.request');

      producerInstance = boss;
      initializing = null;

      return boss;
    });
  }
  return initializing;
}

export function getQueueProducer(): PgBoss {
  if (!producerInstance) {
    throw new Error('Queue producer not initialized');
  }
  return producerInstance;
}

export async function shutdownQueueProducer(): Promise<void> {
  if (producerInstance) {
    await stopBoss(producerInstance);
    producerInstance = null;
  }
}
