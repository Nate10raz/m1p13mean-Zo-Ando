import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  getMyProfileController,
  updateMyProfileController,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const updateValidation = [
  body('nom').optional().isString(),
  body('prenom').optional().isString(),
  body('telephone').optional().isMobilePhone('any').withMessage('Telephone invalide'),
  body('avatar')
    .optional()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Avatar URL invalide'),
  body('adresseLivraison').optional().isString(),
  body('preferences').optional().isObject(),
  body('preferences.notifications').optional().isObject(),
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.inApp').optional().isBoolean(),
];

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Profil utilisateur
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Recuperer le profil de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profil utilisateur }
 *       401: { description: Non authentifie }
 *       404: { description: Utilisateur introuvable }
 */
router.get('/me', requireAuth, getMyProfileController);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Mettre a jour le profil de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               avatar: { type: string }
 *               adresseLivraison: { type: string }
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email: { type: boolean }
 *                       inApp: { type: boolean }
 *     responses:
 *       200: { description: Profil utilisateur mis a jour }
 *       401: { description: Non authentifie }
 *       404: { description: Utilisateur introuvable }
 */
router.patch('/me', requireAuth, updateValidation, validateRequest, updateMyProfileController);

export default router;
