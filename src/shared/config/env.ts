import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // CORS Configuration
  CORS_ALLOWED_ORIGINS: z.string().default('*'),

  // MinIO Configuration
  MINIO_ENDPOINT: z.string().default('http://localhost:9000'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(8),
  MINIO_BUCKET_NAME: z.string().default('howhappy'),

  // External API Configuration (optional for now)
  ELEVENLABS_API_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4'),

  // Worker Configuration
  WORKER_CONCURRENCY: z.string().regex(/^\d+$/).default('5'),
  JOB_RETENTION_DAYS: z.string().regex(/^\d+$/).default('7'),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    const parsed = envSchema.parse(process.env);
    cachedEnv = parsed;
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return loadEnv();
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export type { Env };
