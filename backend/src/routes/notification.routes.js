import { Router } from 'express';
import {
  sendNotification,
  getUserNotifications,
  markAsRead,
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: Gestion des notifications
 */

router.use(requireAuth); // Auth required for all notification routes

router.post('/send', sendNotification);
router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);

/**
 * @openapi
 * /notification/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Envoyer une notification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type, titre, message]
 *             properties:
 *               userId: { type: string }
 *               type: { type: string }
 *               channel:
 *                 type: string
 *                 enum: [in_app, email]
 *               titre: { type: string }
 *               message: { type: string }
 *               data:
 *                 type: object
 *                 properties:
 *                   commandeId: { type: string }
 *                   produitId: { type: string }
 *                   boutiqueId: { type: string }
 *                   url: { type: string }
 *     responses:
 *       201: { description: Notification creee }
 *       403: { description: Forbidden }
 */

/**
 * @openapi
 * /notification:
 *   get:
 *     tags: [Notifications]
 *     summary: Lister les notifications de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Liste des notifications }
 *       403: { description: Forbidden }
 */

/**
 * @openapi
 * /notification/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Marquer une notification comme lue
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification mise a jour }
 *       403: { description: Forbidden }
 *       404: { description: Notification introuvable }
 */

export default router;
