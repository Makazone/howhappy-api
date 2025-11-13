import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { logger } from '@shared/logging/logger.js';
import type { Logger } from 'pino';
import routes from '@app/http/routes/index.js';
import { AppError } from '@shared/errors/app-error.js';
import crypto from 'node:crypto';
import openApiDocument from '@docs/openapi.js';
import { getEnv } from '@shared/config/env.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      logger: Logger;
    }
  }
}

export interface ExpressBootstrapOptions {
  trustProxy?: boolean;
  bodyLimit?: string;
}

export function createExpressApp(options: ExpressBootstrapOptions = {}): Express {
  const app = express();

  if (options.trustProxy) {
    app.set('trust proxy', true);
  }

  // Configure CORS
  const env = getEnv();
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS;

  if (allowedOrigins === '*') {
    // Allow all origins in development
    app.use(
      cors({
        origin: true,
        credentials: true,
      }),
    );
  } else {
    // Allow specific origins (comma-separated)
    const origins = allowedOrigins.split(',').map((origin) => origin.trim());
    app.use(
      cors({
        origin: origins,
        credentials: true,
      }),
    );
  }

  app.use(express.json({ limit: options.bodyLimit || '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: options.bodyLimit || '10mb' }));

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.id = crypto.randomUUID();
    req.logger = logger.child({ requestId: req.id, path: req.path, method: req.method });
    req.logger.info('Request started');
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/ready', async (req: Request, res: Response) => {
    try {
      const { prisma } = await import('@infrastructure/database/client.js');
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      req.logger.error({ error }, 'Readiness check failed');
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(routes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      requestId: req.id,
    });
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    req.logger.error({ error: err }, 'Unhandled error');

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        requestId: req.id,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      requestId: req.id,
    });
  });

  return app;
}
