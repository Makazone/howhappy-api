import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildApp } from '../../src/app.js';
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
import { getQueueProducer, initQueueProducer, shutdownQueueProducer } from '../../src/infrastructure/queue/producer.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

describe('Application Integration Tests', () => {
  let app: Express;
  let containers: TestContainers;

  beforeAll(async () => {
    // Start containers
    containers = await startTestContainers();

    // Wait a bit for containers to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Connect to database first
    await connectDatabase();

    // Apply bootstrap migration
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const migrationPath = resolve(currentDir, '../../prisma/migrations/20250920095931_bootstrap/migration.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    await prisma.$executeRawUnsafe(migrationSql);

    await initQueueProducer({ max: 1 });

    // Test basic database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Build app
    app = buildApp();
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    // Disconnect from database
    await shutdownQueueProducer();
    await disconnectDatabase();

    // Stop containers
    if (containers) {
      await stopTestContainers(containers);
    }
  }, 30000);

  describe('Health Endpoints', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should return ready status when database is connected', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });

  describe('Auth & Survey flows', () => {
    let token: string;
    let surveyId: string;

    it('registers a user', async () => {
      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'owner@example.com',
          password: 'Password123!',
          displayName: 'Owner',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      token = response.body.token;
      expect(response.body.user.email).toBe('owner@example.com');
    });

    it('creates a survey', async () => {
      const response = await request(app)
        .post('/v1/surveys')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Customer Satisfaction',
          prompt: 'Tell us about your experience',
        });

      expect(response.status).toBe(201);
      surveyId = response.body.survey.id;
      expect(response.body.survey.title).toBe('Customer Satisfaction');
    });

    it('lists surveys for the owner', async () => {
      const response = await request(app)
        .get('/v1/surveys')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.surveys).toHaveLength(1);
    });

    it('creates a survey response and returns presigned upload token', async () => {
      const response = await request(app)
        .post(`/v1/surveys/${surveyId}/responses`)
        .send({ anonymousEmail: 'respondent@example.com' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('responseToken');
      expect(response.body.response).toMatchObject({ surveyId });

      const completion = await request(app)
        .patch(`/v1/surveys/${surveyId}/responses/${response.body.response.id}`)
        .set('Authorization', `Bearer ${response.body.responseToken}`)
        .send({ audioUrl: 'http://example.com/audio.webm' });

      expect(completion.status).toBe(200);
      expect(completion.body.response.audioUrl).toBe('http://example.com/audio.webm');

      const boss = getQueueProducer();
      const job = await boss.fetch('transcription.request', { timeout: 5 });
      expect(job?.data).toMatchObject({
        responseId: response.body.response.id,
        surveyId,
      });
      if (job?.id) {
        await boss.complete(job.id);
      }
    });
  });
});
