import type { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '@app/http/middleware/async-handler.js';
import { authService } from '@modules/auth/services/auth.service.js';
import {
  authTokenResponseSchema,
  meResponseSchema,
  userPublicSchema,
  type AuthTokenResponse,
  type MeResponse,
  type UserPublic,
} from '@modules/auth/validators/auth.validators.js';

const toPublicUser = (user: Awaited<ReturnType<typeof authService.getProfile>>): UserPublic =>
  userPublicSchema.parse({
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });

const buildAuthTokenResponse = (
  token: string,
  user: Awaited<ReturnType<typeof authService.getProfile>>,
): AuthTokenResponse =>
  authTokenResponseSchema.parse({
    token,
    user: toPublicUser(user),
  });

const buildMeResponse = (user: Awaited<ReturnType<typeof authService.getProfile>>): MeResponse =>
  meResponseSchema.parse({
    user: toPublicUser(user),
  });

export const register: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.register(req.body);
  const payload = buildAuthTokenResponse(tokens.token, user);
  res.status(201).json(payload);
});

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  const payload = buildAuthTokenResponse(tokens.token, user);
  res.json(payload);
});

export const me: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await authService.getProfile(authUser.id);
  const payload = buildMeResponse(user);
  return res.json(payload);
});
