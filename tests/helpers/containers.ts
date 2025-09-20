import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { logger } from '../../src/shared/logging/logger';

const testLogger = logger.child({ module: 'test-containers' });

export interface TestContainers {
  postgres: StartedTestContainer;
  minio: StartedTestContainer;
}

export async function startTestContainers(): Promise<TestContainers> {
  testLogger.info('Starting test containers...');

  // Start PostgreSQL container
  const postgres = await new GenericContainer('postgres:16')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'howhappy_test',
    })
    .withExposedPorts(5432)
    .withStartupTimeout(120000)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  const postgresPort = postgres.getMappedPort(5432);
  const postgresHost = postgres.getHost();

  // Update DATABASE_URL for the tests
  process.env.DATABASE_URL = `postgresql://test:test@${postgresHost}:${postgresPort}/howhappy_test`;

  testLogger.info({ host: postgresHost, port: postgresPort }, 'PostgreSQL container started');

  // Start MinIO container
  const minio = await new GenericContainer('minio/minio:latest')
    .withEnvironment({
      MINIO_ROOT_USER: 'minioadmin',
      MINIO_ROOT_PASSWORD: 'minioadmin',
    })
    .withExposedPorts(9000)
    .withCommand(['server', '/data'])
    .withStartupTimeout(60000)
    .start();

  const minioPort = minio.getMappedPort(9000);
  const minioHost = minio.getHost();

  // Update MinIO environment variables for the tests
  process.env.MINIO_ENDPOINT = minioHost;
  process.env.MINIO_PORT = minioPort.toString();
  process.env.MINIO_ACCESS_KEY = 'minioadmin';
  process.env.MINIO_SECRET_KEY = 'minioadmin';
  process.env.MINIO_USE_SSL = 'false';

  testLogger.info({ host: minioHost, port: minioPort }, 'MinIO container started');

  return { postgres, minio };
}

export async function stopTestContainers(containers: TestContainers): Promise<void> {
  testLogger.info('Stopping test containers...');

  await Promise.all([containers.postgres.stop(), containers.minio.stop()]);

  testLogger.info('Test containers stopped');
}
