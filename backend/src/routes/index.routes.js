import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';

const router = Router();

router.get('/', helloController);

export default router;
