import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { surveyService } from '@modules/survey/services/survey.service.js';
import {
  surveyListResponseSchema,
  surveyCreatedResponseSchema,
  surveyUpdateResponseSchema,
  surveySchema,
  type Survey,
} from '@modules/survey/schema.js';
import type { Survey as PrismaSurvey } from '@prisma/client';

type ServiceSurveyEntity = PrismaSurvey;
type SurveyListResult = Awaited<ReturnType<typeof surveyService.list>> & { items: PrismaSurvey[] };

const toSurveyDto = (survey: ServiceSurveyEntity): Survey =>
  surveySchema.parse({
    id: survey.id,
    ownerId: survey.ownerId,
    title: survey.title,
    prompt: survey.prompt,
    status: survey.status,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  });

const buildListResponse = (result: SurveyListResult) =>
  surveyListResponseSchema.parse({
    surveys: result.items.map(toSurveyDto),
    nextCursor: result.nextCursor ?? null,
  });

const buildCreatedResponse = (survey: ServiceSurveyEntity) =>
  surveyCreatedResponseSchema.parse({ survey: toSurveyDto(survey) });

const buildUpdatedResponse = (survey: ServiceSurveyEntity) =>
  surveyUpdateResponseSchema.parse({ survey: toSurveyDto(survey) });

export const listSurveys: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const result = (await surveyService.list(authUser.id, req.query)) as SurveyListResult;
  res.json(buildListResponse(result));
});

export const getSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = (await surveyService.get(authUser.id, req.params.id)) as ServiceSurveyEntity;
  res.json(buildCreatedResponse(survey));
});

export const createSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = (await surveyService.create(authUser.id, req.body)) as ServiceSurveyEntity;
  res.status(201).json(buildCreatedResponse(survey));
});

export const updateSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = (await surveyService.update(
    authUser.id,
    req.params.id,
    req.body,
  )) as ServiceSurveyEntity;
  res.json(buildUpdatedResponse(survey));
});
