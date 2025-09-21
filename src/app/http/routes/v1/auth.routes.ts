import { Router } from 'express';
import { register, login, me } from '../../controllers/auth.controller.js';
import { validateBody } from '../../middleware/validation.js';
import { requireUser } from '../../middleware/authentication.js';
import { registerInputSchema, loginInputSchema } from '@modules/auth/schema.js';

const router: Router = Router();

router.post('/auth/register', validateBody(registerInputSchema), register);
router.post('/auth/login', validateBody(loginInputSchema), login);
router.get('/auth/me', requireUser(), me);

export default router;
