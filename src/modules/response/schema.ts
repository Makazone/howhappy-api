import { z } from 'zod';

export const prepareResponseSchema = z.object({
  anonymousEmail: z.string().email().optional(),
});

export const completeResponseSchema = z.object({
  audioUrl: z.string().url(),
});

export const uploadStateEnum = z.enum(['PREPARED', 'UPLOADING', 'COMPLETED', 'FAILED']);

export const jobStatusEnum = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const surveyResponseSchema = z.object({
  id: z.string().uuid(),
  surveyId: z.string().uuid(),
  registeredUserId: z.string().uuid().nullable().optional(),
  anonymousEmail: z.string().email().nullable().optional(),
  audioUrl: z.string().url().nullable().optional(),
  uploadState: uploadStateEnum,
  transcription: z.string().nullable().optional(),
  transcriptionStatus: jobStatusEnum,
  analysis: z.record(z.any()).nullable().optional(),
  analysisStatus: jobStatusEnum,
  duration: z.number().int().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  language: z.string().nullable().optional(),
  segments: z.array(z.record(z.any())).nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const prepareResponseResultSchema = z.object({
  response: surveyResponseSchema,
  uploadUrl: z.string().url(),
  responseToken: z.string(),
});

export const responseCompletionSchema = z.object({
  response: surveyResponseSchema,
});

export const responseListSchema = z.object({
  responses: z.array(surveyResponseSchema),
});

export const singleResponseSchema = z.object({
  response: surveyResponseSchema,
});

export const submitResponseSchema = z.object({
  responseId: z.string().uuid(),
  audioUrl: z.string().url(),
});

export const submitResponseResultSchema = z.object({
  response: surveyResponseSchema,
  jobId: z.string().optional(),
});

export type PrepareResponseInput = z.infer<typeof prepareResponseSchema>;
export type CompleteResponseInput = z.infer<typeof completeResponseSchema>;
export type SurveyResponse = z.infer<typeof surveyResponseSchema>;
export type PrepareResponseResult = z.infer<typeof prepareResponseResultSchema>;
export type ResponseCompletion = z.infer<typeof responseCompletionSchema>;
export type ResponseList = z.infer<typeof responseListSchema>;
export type SingleResponse = z.infer<typeof singleResponseSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type SubmitResponseResult = z.infer<typeof submitResponseResultSchema>;
