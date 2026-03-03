import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createBoxTypeController,
  listBoxTypesController,
  getBoxTypeController,
  updateBoxTypeController,
  deleteBoxTypeController,
} from '../controllers/box-type.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: BoxTypes
 *     description: Gestion des types de box (admin)
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('nom').isString().notEmpty().withMessage('Nom requis'),
    body('description').optional().isString(),
    body('caracteristiques').optional().isArray(),
    body('estActif').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  createBoxTypeController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('estActif').optional().isBoolean().toBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listBoxTypesController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box type invalide')],
  validateRequest,
  getBoxTypeController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id box type invalide'),
    body('nom').optional().isString(),
    body('description').optional().isString(),
    body('caracteristiques').optional().isArray(),
    body('estActif').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  updateBoxTypeController,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box type invalide')],
  validateRequest,
  deleteBoxTypeController,
);

/**
 * @openapi
 * /box-types:
 *   post:
 *     tags: [BoxTypes]
 *     summary: Creer un type de box
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom]
 *             properties:
 *               nom: { type: string }
 *               description: { type: string }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               estActif: { type: boolean }
 *     responses:
 *       201: { description: BoxType cree }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *   get:
 *     tags: [BoxTypes]
 *     summary: Lister les types de box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
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
 *       200: { description: Liste des box types }
 *
 * /box-types/{id}:
 *   get:
 *     tags: [BoxTypes]
 *     summary: Recuperer un type de box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: BoxType }
 *       404: { description: BoxType introuvable }
 *   patch:
 *     tags: [BoxTypes]
 *     summary: Mettre a jour un type de box
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
 *               nom: { type: string }
 *               description: { type: string }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               estActif: { type: boolean }
 *     responses:
 *       200: { description: BoxType mis a jour }
 *       404: { description: BoxType introuvable }
 *   delete:
 *     tags: [BoxTypes]
 *     summary: Supprimer un type de box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: BoxType supprime }
 *       404: { description: BoxType introuvable }
 *       409: { description: Type utilise par des boxes }
 */

export default router;
