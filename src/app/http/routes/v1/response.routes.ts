import { Router } from 'express';
import {
  prepareResponse,
  completeResponse,
  listResponses,
  getResponse,
  submitResponse,
} from '../../controllers/response.controller.js';
import { validateBody } from '../../middleware/validation.js';
import {
  optionalUser,
  requireResponseToken,
  requireUser,
} from '../../middleware/authentication.js';
import {
  completeResponseSchema,
  prepareResponseSchema,
  submitResponseSchema,
} from '@modules/response/schema.js';

const router: Router = Router({ mergeParams: true });

router.post(
  '/surveys/:id/responses',
  optionalUser(),
  validateBody(prepareResponseSchema),
  prepareResponse,
);

router.patch(
  '/surveys/:surveyId/responses/:responseId',
  requireResponseToken(),
  validateBody(completeResponseSchema),
  completeResponse,
);

router.get('/surveys/:surveyId/responses', requireUser(), listResponses);

router.get('/surveys/:surveyId/responses/:responseId', requireUser(), getResponse);

router.post(
  '/surveys/:surveyId/responses/submit',
  requireResponseToken(),
  validateBody(submitResponseSchema),
  submitResponse,
);

export default router;
