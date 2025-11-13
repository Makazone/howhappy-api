import type { RequestHandler } from 'express';
import { UnauthorizedError } from '@shared/errors/app-error.js';
import {
  verifyToken,
  isUserToken,
  isResponseToken,
  type ResponseTokenPayload,
} from '@shared/security/jwt.js';

export interface AuthenticatedUser {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      responseTokenPayload?: ResponseTokenPayload;
    }
  }
}

function extractBearerToken(header?: string): string {
  if (!header) {
    throw new UnauthorizedError('Missing authorization header');
  }
  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    throw new UnauthorizedError('Invalid authorization header');
  }
  return value;
}

export function requireUser(): RequestHandler {
  return (req, _res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const payload = verifyToken(token);
      if (!isUserToken(payload)) {
        throw new UnauthorizedError('Invalid token type');
      }
      req.user = { id: payload.sub };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function optionalUser(): RequestHandler {
  return (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }
    try {
      const token = extractBearerToken(authHeader);
      const payload = verifyToken(token);
      if (isUserToken(payload)) {
        req.user = { id: payload.sub };
      }
    } catch (error) {
      return next(error);
    }
    return next();
  };
}

export function requireResponseToken(): RequestHandler {
  return (req, _res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const payload = verifyToken(token);
      if (!isResponseToken(payload)) {
        throw new UnauthorizedError('Response token required');
      }
      req.responseTokenPayload = payload;
      next();
    } catch (error) {
      next(error);
    }
  };
}
