import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildApp } from '../../src/app';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
} from '../../src/infrastructure/database/client';
import {
  startTestContainers,
  stopTestContainers,
  type TestContainers,
} from '../helpers/containers';

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

    // Test basic database connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Build app
    app = buildApp();
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    // Disconnect from database
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
});
