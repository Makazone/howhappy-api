import { z } from 'zod';

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120).optional(),
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const authTokenResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
});

export const meResponseSchema = z.object({
  user: userPublicSchema,
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
