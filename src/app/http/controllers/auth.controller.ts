import type { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { authService } from '@modules/auth/services/auth.service.js';

function toPublicUser<T extends { passwordHash?: string }>({ passwordHash: _discard, ...rest }: T): Omit<T, 'passwordHash'> {
  return rest;
}

export const register: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.register(req.body);

  return res.status(201).json({ user: toPublicUser(user), token: tokens.token });
});

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);

  return res.json({ user: toPublicUser(user), token: tokens.token });
});

export const me: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await authService.getProfile(authUser.id);

  return res.json({ user: toPublicUser(user) });
});
