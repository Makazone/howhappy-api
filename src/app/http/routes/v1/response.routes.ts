import { Router } from 'express';
import { prepareResponse, completeResponse } from '../../controllers/response.controller.js';
import { validateBody } from '../../middleware/validation.js';
import { optionalUser, requireResponseToken } from '../../middleware/authentication.js';
import { completeResponseSchema, prepareResponseSchema } from '@modules/response/schema.js';

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

export default router;
