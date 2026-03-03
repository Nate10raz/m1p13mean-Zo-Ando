import * as notificationService from '../services/notification.service.js';

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: Gestion des alertes et notifications utilisateur (In-app, Email)
 */

/**
 * @openapi
 * /notification/send:
 *   post:
 *     tags: [Notifications]
 *     summary: Envoyer une notification (Admin/Système)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type, titre, message]
 *             properties:
 *               userId: { type: string, description: "ID de l'utilisateur destinataire" }
 *               type: { type: string, example: "COMMANDE_EN_COURS" }
 *               channel: { type: string, enum: [in_app, email], default: in_app }
 *               titre: { type: string }
 *               message: { type: string }
 *               data: { type: object, description: "Données additionnelles pour le frontend" }
 *     responses:
 *       201: { description: Notification envoyée et enregistrée }
 */
export const sendNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /notification:
 *   get:
 *     tags: [Notifications]
 *     summary: Récupérer mes notifications (In-app)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des notifications triées par date (décroissant) }
 */
export const getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /notification/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Marquer une notification spécifique comme lue
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: État "vu" mis à jour }
 *       404: { description: Notification introuvable }
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.id);
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /notification/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Marquer toutes mes notifications comme lues
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Toutes les notifications marquées comme lues }
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.user.id);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /notification/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Supprimer une notification spécifique
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Notification supprimée avec succès }
 */
export const deleteNotification = async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /notification/all:
 *   delete:
 *     tags: [Notifications]
 *     summary: Supprimer tout mon historique de notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Historique vidé }
 */
export const deleteAllNotifications = async (req, res, next) => {
  try {
    await notificationService.deleteAllNotifications(req.user.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
