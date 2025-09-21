import { z } from 'zod';

export const prepareResponseSchema = z.object({
  anonymousEmail: z.string().email().optional(),
});

export const completeResponseSchema = z.object({
  audioUrl: z.string().url(),
});

export type PrepareResponseInput = z.infer<typeof prepareResponseSchema>;
export type CompleteResponseInput = z.infer<typeof completeResponseSchema>;
