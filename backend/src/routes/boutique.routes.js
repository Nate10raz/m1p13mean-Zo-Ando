import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import {
  getMyBoutiqueController,
  getBoutiqueSalesDashboardController,
} from '../controllers/boutique.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags :
 *   - name : Boutiques
 *     description : Gestion des boutiques
 */

router.get('/me', requireAuth, requireRole('boutique'), getMyBoutiqueController);

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

router.get(
  '/dashboard/ventes',
  requireAuth,
  requireRole('boutique'),
  [
    query('startDate').optional().isISO8601().withMessage('startDate invalide'),
    query('endDate').optional().isISO8601().withMessage('endDate invalide'),
    query('topN').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('granularity').optional().isIn(['day', 'week', 'month']),
  ],
  validateRequest,
  getBoutiqueSalesDashboardController,
);

/**
 * @openapi
 * /boutiques/me:
 *   get:
 *     tags: [Boutiques]
 *     summary: Recuperer la boutique de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Boutique }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 */

/**
 * @openapi
 * /boutiques/dashboard/ventes:
 *   get:
 *     tags: [Boutiques]
 *     summary: Dashboard ventes et vue boutique
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: topN
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 *       - in: query
 *         name: granularity
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200: { description: Dashboard ventes boutique }
 */

export default router;
