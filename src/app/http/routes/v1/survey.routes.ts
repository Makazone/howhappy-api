import { Router } from 'express';
import {
  listSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
} from '@modules/survey/controllers/survey.controller.js';
import { validateBody, validateQuery } from '../../middleware/validation.js';
import { requireUser } from '@modules/auth/middleware/authentication.js';
import {
  createSurveySchema,
  listSurveyQuerySchema,
  updateSurveySchema,
} from '@modules/survey/validators/survey.validators.js';

const router: Router = Router();

router.use(requireUser());

router.get('/surveys', validateQuery(listSurveyQuerySchema), listSurveys);
router.post('/surveys', validateBody(createSurveySchema), createSurvey);
router.get('/surveys/:id', getSurvey);
router.patch('/surveys/:id', validateBody(updateSurveySchema), updateSurvey);

export default router;
