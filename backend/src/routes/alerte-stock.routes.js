import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createAlerteStockController,
  listAlerteStockController,
  getAlerteStockController,
  updateAlerteStockController,
  deleteAlerteStockController,
} from '../controllers/alerte-stock.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: AlertesStock
 *     description: Gestion des alertes de stock
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

router.use(requireAuth, requireRole('admin', 'boutique'));

router.post(
  '/',
  [
    body('produitId').isMongoId().withMessage('produitId invalide'),
    body('variationId')
      .optional({ nullable: true })
      .isMongoId()
      .withMessage('variationId invalide'),
    body('seuil').isFloat({ min: 0 }).withMessage('seuil invalide'),
    body('estActif').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  createAlerteStockController,
);

router.get(
  '/',
  [
    query('produitId').optional().isMongoId().withMessage('produitId invalide'),
    query('variationId').optional().isMongoId().withMessage('variationId invalide'),
    query('estActif').optional().isBoolean().toBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listAlerteStockController,
);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Id alerte invalide')],
  validateRequest,
  getAlerteStockController,
);

router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Id alerte invalide'),
    body('seuil').optional().isFloat({ min: 0 }).withMessage('seuil invalide'),
    body('estActif').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  updateAlerteStockController,
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Id alerte invalide')],
  validateRequest,
  deleteAlerteStockController,
);

/**
 * @openapi
 * /alertes-stock:
 *   post:
 *     tags: [AlertesStock]
 *     summary: Creer une alerte de stock
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, seuil]
 *             properties:
 *               produitId: { type: string }
 *               variationId: { type: string }
 *               seuil: { type: number, minimum: 0 }
 *               estActif: { type: boolean }
 *     responses:
 *       201: { description: Alerte stock creee }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Produit ou variation introuvable }
 *       409: { description: Alerte deja existante }
 *   get:
 *     tags: [AlertesStock]
 *     summary: Lister les alertes de stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: produitId
 *         schema: { type: string }
 *       - in: query
 *         name: variationId
 *         schema: { type: string }
 *       - in: query
 *         name: estActif
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Liste des alertes }
 *
 * /alertes-stock/{id}:
 *   get:
 *     tags: [AlertesStock]
 *     summary: Recuperer une alerte de stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Alerte stock }
 *       404: { description: Alerte introuvable }
 *   patch:
 *     tags: [AlertesStock]
 *     summary: Mettre a jour une alerte de stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seuil: { type: number, minimum: 0 }
 *               estActif: { type: boolean }
 *     responses:
 *       200: { description: Alerte stock mise a jour }
 *       404: { description: Alerte introuvable }
 *   delete:
 *     tags: [AlertesStock]
 *     summary: Supprimer une alerte de stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Alerte stock supprimee }
 *       404: { description: Alerte introuvable }
 */

export default router;
