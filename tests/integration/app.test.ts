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
import {
  getQueueProducer,
  initQueueProducer,
  shutdownQueueProducer,
} from '../../src/infrastructure/queue/producer.js';
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

    // Apply migrations
    const currentDir = dirname(fileURLToPath(import.meta.url));

    // Apply bootstrap migration
    const bootstrapMigrationPath = resolve(
      currentDir,
      '../../prisma/migrations/20250921090508_init/migration.sql',
    );
    const bootstrapMigrationSql = readFileSync(bootstrapMigrationPath, 'utf-8');
    await prisma.$executeRawUnsafe(bootstrapMigrationSql);

    // Apply survey metrics migration
    const metricsMigrationPath = resolve(
      currentDir,
      '../../prisma/migrations/20251020120608_add_survey_metrics_and_response_fields/migration.sql',
    );
    const metricsMigrationSql = readFileSync(metricsMigrationPath, 'utf-8');
    await prisma.$executeRawUnsafe(metricsMigrationSql);

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
      const response = await request(app).post('/v1/auth/register').send({
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

    it('gets survey with metrics', async () => {
      const response = await request(app)
        .get(`/v1/surveys/${surveyId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.survey).toMatchObject({
        id: surveyId,
        title: 'Customer Satisfaction',
        visits: expect.any(Number),
        submits: expect.any(Number),
        completionRate: expect.any(Number),
      });
      expect(response.body.survey).toHaveProperty('insightSummary');
      expect(response.body.survey).toHaveProperty('lastActivityAt');
    });

    it('lists all responses for a survey', async () => {
      const response = await request(app)
        .get(`/v1/surveys/${surveyId}/responses`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('responses');
      expect(Array.isArray(response.body.responses)).toBe(true);
    });

    it('gets a specific response with details', async () => {
      // First create a response
      const createResponse = await request(app)
        .post(`/v1/surveys/${surveyId}/responses`)
        .send({ anonymousEmail: 'test@example.com' });

      const responseId = createResponse.body.response.id;

      // Get the response details
      const response = await request(app)
        .get(`/v1/surveys/${surveyId}/responses/${responseId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.response).toMatchObject({
        id: responseId,
        surveyId,
        anonymousEmail: 'test@example.com',
      });
    });

    it('submits a response with audio URL via submit endpoint', async () => {
      // Create a response
      const createResponse = await request(app)
        .post(`/v1/surveys/${surveyId}/responses`)
        .send({ anonymousEmail: 'submit-test@example.com' });

      const responseId = createResponse.body.response.id;
      const responseToken = createResponse.body.responseToken;

      // Submit the response
      const submitResponse = await request(app)
        .post(`/v1/surveys/${surveyId}/responses/submit`)
        .set('Authorization', `Bearer ${responseToken}`)
        .send({
          responseId,
          audioUrl: 'http://example.com/test-audio.webm',
        });

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.response).toMatchObject({
        id: responseId,
        audioUrl: 'http://example.com/test-audio.webm',
        uploadState: 'COMPLETED',
      });
      expect(submitResponse.body).toHaveProperty('jobId');

      // Verify job was enqueued
      const boss = getQueueProducer();
      const job = await boss.fetch('transcription.request', { timeout: 5 });
      expect(job?.data).toMatchObject({
        responseId,
        surveyId,
      });
      if (job?.id) {
        await boss.complete(job.id);
      }
    });
  });
});
