import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createBoss, stopBoss } from '../../src/app/bootstrap/boss.js';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
} from '../../src/infrastructure/database/client.js';
import {
  startTestContainers,
  stopTestContainers,
  type TestContainers,
} from '../helpers/containers.js';
import type PgBoss from 'pg-boss';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Worker Integration Tests', () => {
  let boss: PgBoss;
  let containers: TestContainers;

  beforeAll(async () => {
    // Start containers
    containers = await startTestContainers();

    // Wait for containers to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Connect to database
    await connectDatabase();

    const currentDir = dirname(fileURLToPath(import.meta.url));
    const migrationPath = resolve(
      currentDir,
      '../../prisma/migrations/20250920095931_bootstrap/migration.sql',
    );
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    await prisma.$executeRawUnsafe(migrationSql);

    // Create pg-boss instance
    boss = await createBoss();
  }, 120000);

  afterAll(async () => {
    if (boss) {
      await stopBoss(boss);
    }

    await disconnectDatabase();

    if (containers) {
      await stopTestContainers(containers);
    }
  }, 30000);

  describe('Job Queue Operations', () => {
    it('should enqueue and process a transcription job', async () => {
      const jobData = {
        responseId: 'test-response-123',
        audioUrl: 'https://example.com/audio.mp3',
      };

      // Define a test handler
      let jobProcessed = false;
      await boss.work('transcription.request', async (job: PgBoss.Job) => {
        expect(job.data).toEqual(jobData);
        jobProcessed = true;
      });

      // Send the job
      const jobId = await boss.send('transcription.request', jobData);
      expect(jobId).toBeTruthy();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(jobProcessed).toBe(true);
    });

    it('should enqueue and process an analysis job', async () => {
      const jobData = {
        responseId: 'test-response-456',
        transcription: 'This is a test transcription',
      };

      // Define a test handler
      let jobProcessed = false;
      await boss.work('analysis.request', async (job: PgBoss.Job) => {
        expect(job.data).toEqual(jobData);
        jobProcessed = true;
      });

      // Send the job
      const jobId = await boss.send('analysis.request', jobData);
      expect(jobId).toBeTruthy();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(jobProcessed).toBe(true);
    });

    it('should handle job failures with retry', async () => {
      let attemptCount = 0;

      // Define a handler that fails on first attempt
      await boss.work('test.retry', async (_job: PgBoss.Job) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt failed');
        }
      });

      // Send job with retry options
      await boss.send(
        'test.retry',
        { test: true },
        {
          retryLimit: 2,
          retryDelay: 1,
        },
      );

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(attemptCount).toBeGreaterThanOrEqual(2);
    });
  });
});
