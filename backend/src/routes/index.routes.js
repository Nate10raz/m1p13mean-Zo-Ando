import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/', helloController);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
