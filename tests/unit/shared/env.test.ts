import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadEnv, getEnv } from '../../../src/shared/config/env.js';

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset module cache to ensure fresh environment loading
    vi.resetModules();
  });

  it('should load environment variables with defaults', () => {
    const env = loadEnv();

    expect(env).toBeDefined();
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe('3000');
    expect(env.LOG_LEVEL).toBe('error');
  });

  it('should return cached environment on subsequent calls', () => {
    const firstCall = getEnv();
    const secondCall = getEnv();

    expect(firstCall).toBe(secondCall);
  });

  it('should validate required environment variables', async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    // Force reload by clearing the module cache
    vi.resetModules();

    // Import fresh module and expect it to throw
    const { loadEnv } = await import('../../../src/shared/config/env.js');

    expect(() => loadEnv()).toThrow('Environment validation failed');

    // Restore
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('should parse boolean environment variables correctly', async () => {
    process.env.MINIO_USE_SSL = 'true';
    vi.resetModules();

    const module1 = await import('../../../src/shared/config/env.js');
    const env1 = module1.loadEnv();
    expect(env1.MINIO_USE_SSL).toBe(true);

    process.env.MINIO_USE_SSL = 'false';
    vi.resetModules();

    const module2 = await import('../../../src/shared/config/env.js');
    const env2 = module2.loadEnv();
    expect(env2.MINIO_USE_SSL).toBe(false);
  });
});
