import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.get('/', helloController);
router.use('/auth', authRoutes);

export default router;
