import { beforeAll, afterAll, beforeEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/howhappy_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only-12345';
process.env.MINIO_ACCESS_KEY = 'test-access-key';
process.env.MINIO_SECRET_KEY = 'test-secret-key';
process.env.LOG_LEVEL = 'error'; // Keep logs quiet during tests

beforeAll(async () => {
  // Global setup if needed
});

afterAll(async () => {
  // Global cleanup if needed
});

beforeEach(() => {
  // Reset any mocks or state before each test
});
