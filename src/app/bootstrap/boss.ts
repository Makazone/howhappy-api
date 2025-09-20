import PgBoss from 'pg-boss';
import { logger } from '@shared/logging/logger.js';

export interface BossConfig {
  connectionString?: string;
  max?: number;
  retentionDays?: number;
  monitorStateIntervalSeconds?: number;
  maintenanceIntervalSeconds?: number;
}

const bossLogger = logger.child({ module: 'pg-boss' });

export async function createBoss(config: BossConfig = {}): Promise<PgBoss> {
  const connectionString = config.connectionString || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for pg-boss');
  }

  const boss = new PgBoss({
    connectionString,
    max: config.max || 10,
    retentionDays: config.retentionDays || 7,
    monitorStateIntervalSeconds: config.monitorStateIntervalSeconds || 30,
    maintenanceIntervalSeconds: config.maintenanceIntervalSeconds || 120,
  });

  boss.on('error', (error: Error) => {
    bossLogger.error({ error }, 'pg-boss error event');
  });

  boss.on('maintenance', () => {
    bossLogger.debug('pg-boss maintenance completed');
  });

  boss.on('monitor-states', (states) => {
    bossLogger.debug({ states }, 'pg-boss monitor states');
  });

  try {
    await boss.start();
    bossLogger.info('pg-boss started successfully');
  } catch (error) {
    bossLogger.error({ error }, 'Failed to start pg-boss');
    throw error;
  }

  return boss;
}

export async function stopBoss(boss: PgBoss): Promise<void> {
  try {
    await boss.stop();
    bossLogger.info('pg-boss stopped successfully');
  } catch (error) {
    bossLogger.error({ error }, 'Failed to stop pg-boss');
    throw error;
  }
}
