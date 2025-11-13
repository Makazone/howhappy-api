import type PgBoss from 'pg-boss';
import { logger } from '@shared/logging/logger.js';
import { AppError } from '@shared/errors/app-error.js';

/**
 * Wraps job execution with structured error logging and handling
 */
export async function withJobErrorHandling<T>(
  job: PgBoss.Job<T>,
  handler: (data: T, jobId: string) => Promise<void>,
): Promise<void> {
  const jobLogger = logger.child({ jobId: job.id, jobName: job.name });

  try {
    await handler(job.data, job.id);
    jobLogger.info({ data: job.data }, 'Job completed successfully');
  } catch (error) {
    if (error instanceof AppError) {
      jobLogger.error(
        {
          error: error.message,
          statusCode: error.statusCode,
          data: job.data,
        },
        'Job failed with application error',
      );
    } else {
      jobLogger.error({ error, data: job.data }, 'Job failed with unexpected error');
    }
    throw error;
  }
}

/**
 * Helper to log job start with consistent format
 */
export function logJobStart<T>(job: PgBoss.Job<T>, context?: Record<string, unknown>): void {
  const jobLogger = logger.child({ jobId: job.id, jobName: job.name });
  jobLogger.info({ data: job.data, ...context }, 'Job started');
}

/**
 * Helper to log job completion with consistent format
 */
export function logJobComplete<T>(job: PgBoss.Job<T>, context?: Record<string, unknown>): void {
  const jobLogger = logger.child({ jobId: job.id, jobName: job.name });
  jobLogger.info({ data: job.data, ...context }, 'Job completed');
}
