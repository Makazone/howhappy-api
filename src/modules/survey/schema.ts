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

export const surveySchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  prompt: z.string(),
  status: surveyStatusEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const surveyListResponseSchema = z.object({
  surveys: z.array(surveySchema),
  nextCursor: z.string().uuid().nullable(),
});

export const singleSurveyResponseSchema = z.object({
  survey: surveySchema,
});

export const surveyCreatedResponseSchema = singleSurveyResponseSchema;

export const surveyUpdateResponseSchema = singleSurveyResponseSchema;

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type ListSurveyQuery = z.infer<typeof listSurveyQuerySchema>;
export type Survey = z.infer<typeof surveySchema>;
export type SurveyListResponse = z.infer<typeof surveyListResponseSchema>;
export type SingleSurveyResponse = z.infer<typeof singleSurveyResponseSchema>;
