import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@shared/errors/app-error.js';

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(new ValidationError(error instanceof Error ? error.message : 'Invalid body'));
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return async (req, _res, next) => {
    try {
      await schema.parseAsync(req.query);
      next();
    } catch (error) {
      next(new ValidationError(error instanceof Error ? error.message : 'Invalid query'));
    }
  };
}
