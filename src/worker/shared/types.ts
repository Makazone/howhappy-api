import type PgBoss from 'pg-boss';

/**
 * Configuration for registering a worker with pg-boss
 */
export interface WorkerConfig<T = any> {
  queueName: string;
  handler: (jobs: PgBoss.Job<T>[]) => Promise<void>;
  options?: PgBoss.WorkOptions;
}

/**
 * Standard job result for successful processing
 */
export interface JobSuccess {
  success: true;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Standard job result for failed processing
 */
export interface JobFailure {
  success: false;
  error: string;
  code?: string;
  retryable?: boolean;
}

export type JobResult = JobSuccess | JobFailure;
