import { Router } from 'express';
import authRoutes from './auth.routes.js';
import surveyRoutes from './survey.routes.js';
import responseRoutes from './response.routes.js';

const router: Router = Router();

router.use(authRoutes);
router.use(responseRoutes);
router.use(surveyRoutes);

export default router;
