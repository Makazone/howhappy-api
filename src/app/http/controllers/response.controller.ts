import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { responseService } from '@modules/response/services/response.service.js';

export const prepareResponse: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await responseService.prepare({
    surveyId: req.params.id,
    actorUserId: req.user?.id,
    payload: req.body,
  });

  return res.status(201).json(result);
});

export const completeResponse: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
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

  return res.json({ response });
});
