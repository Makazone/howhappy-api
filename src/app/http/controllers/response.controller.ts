import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { responseService } from '@modules/response/services/response.service.js';
import {
  surveyResponseSchema,
  prepareResponseResultSchema,
  responseCompletionSchema,
  type SurveyResponse,
  type PrepareResponseResult,
  type ResponseCompletion,
} from '@modules/response/schema.js';
import type { SurveyResponse as PrismaSurveyResponse } from '@prisma/client';

type PrepareResult = Awaited<ReturnType<typeof responseService.prepare>>;

type ServiceResponseEntity = PrismaSurveyResponse;

const toSurveyResponseDto = (response: ServiceResponseEntity): SurveyResponse =>
  surveyResponseSchema.parse({
    id: response.id,
    surveyId: response.surveyId,
    registeredUserId: response.registeredUserId ?? null,
    anonymousEmail: response.anonymousEmail ?? null,
    audioUrl: response.audioUrl ?? null,
    uploadState: response.uploadState,
    transcription: response.transcription ?? null,
    transcriptionStatus: response.transcriptionStatus,
    analysis: response.analysis ?? null,
    analysisStatus: response.analysisStatus,
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  });

const buildPrepareResult = (result: PrepareResult): PrepareResponseResult =>
  prepareResponseResultSchema.parse({
    response: toSurveyResponseDto(result.response),
    uploadUrl: result.uploadUrl,
    responseToken: result.responseToken,
  });

const buildCompletionResult = (response: ServiceResponseEntity): ResponseCompletion =>
  responseCompletionSchema.parse({ response: toSurveyResponseDto(response) });

export const prepareResponse: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await responseService.prepare({
    surveyId: req.params.id,
    actorUserId: req.user?.id,
    payload: req.body,
  });

  return res.status(201).json(buildPrepareResult(result));
});

export const completeResponse: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.responseTokenPayload) {
      return res.status(401).json({ error: 'Response token required' });
    }

    const response = await responseService.complete({
      surveyId: req.params.surveyId,
      responseId: req.params.responseId,
      payload: req.body,
      token: req.responseTokenPayload,
      actorUserId: req.user?.id,
    });

    return res.json(buildCompletionResult(response));
  },
);
