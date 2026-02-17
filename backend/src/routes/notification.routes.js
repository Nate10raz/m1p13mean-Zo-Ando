import { Router } from 'express';
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth); // Auth required for all notification routes

router.post('/send', sendNotification);
router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);

export default router;
