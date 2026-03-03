import { Router } from 'express';
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth); // Auth required for all notification routes

router.post('/send', sendNotification);
router.get('/', getUserNotifications);
router.put('/read-all', markAllAsRead);
router.delete('/all', deleteAllNotifications);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
