import { createExpressApp } from '@app/bootstrap/express.js';
import type { Express } from 'express';

export function buildApp(): Express {
  const app = createExpressApp({
    trustProxy: process.env.NODE_ENV === 'production',
  });

  return app;
}
