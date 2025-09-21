import { z } from 'zod';

export const surveyStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'CLOSED']);

export const createSurveySchema = z.object({
  title: z.string().min(1).max(180),
  prompt: z.string().min(1),
});

export const updateSurveySchema = z
  .object({
    title: z.string().min(1).max(180).optional(),
    prompt: z.string().min(1).optional(),
    status: surveyStatusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const listSurveyQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: surveyStatusEnum.optional(),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type ListSurveyQuery = z.infer<typeof listSurveyQuerySchema>;
