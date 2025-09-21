import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { surveyService } from '@modules/survey/services/survey.service.js';

export const listSurveys: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const result = await surveyService.list(authUser.id, req.query);
  res.json({ surveys: result.items, nextCursor: result.nextCursor ?? null });
});

export const getSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = await surveyService.get(authUser.id, req.params.id);
  res.json({ survey });
});

export const createSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = await surveyService.create(authUser.id, req.body);
  res.status(201).json({ survey });
});

export const updateSurvey: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user!;
  const survey = await surveyService.update(authUser.id, req.params.id, req.body);
  res.json({ survey });
});
