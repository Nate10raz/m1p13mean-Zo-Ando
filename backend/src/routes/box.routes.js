import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createBoxController,
  updateBoxTarifController,
  listBoxesController,
  listAvailableBoxesController,
  getBoxController,
  updateBoxController,
  deleteBoxController,
} from '../controllers/box.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Box
 *     description: Gestion des box (admin)
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

router.patch(
  '/:id/tarif',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id box invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('montant invalide'),
    body('unite').isIn(['mois', 'annee']).withMessage('unite invalide'),
    body('dateDebut').isISO8601().withMessage('dateDebut invalide'),
    body('raison').optional().isString(),
  ],
  validateRequest,
  updateBoxTarifController,
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('numero').isString().notEmpty().withMessage('numero requis'),
    body('etage').isInt().withMessage('etage invalide'),
    body('zone').isString().notEmpty().withMessage('zone requis'),
    body('superficie').isFloat({ min: 0 }).withMessage('superficie invalide'),
    body('typeId').isMongoId().withMessage('typeId invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('montant invalide'),
    body('unite').isIn(['mois', 'annee']).withMessage('unite invalide'),
    body('dateDebut').isISO8601().withMessage('dateDebut invalide'),
    body('raison').optional().isString(),
    body('allee').optional().isString(),
    body('position').optional().isString(),
    body('description').optional().isString(),
    body('caracteristiques').optional().isArray(),
    body('photos').optional().isArray(),
  ],
  validateRequest,
  createBoxController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('zone').optional().isString().trim().isLength({ min: 1 }),
    query('etage').optional().isInt().toInt(),
    query('typeId').optional().isMongoId().withMessage('typeId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('estOccupe').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  listBoxesController,
);

router.get(
  '/available',
  requireAuth,
  requireRole('boutique'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('zone').optional().isString().trim().isLength({ min: 1 }),
    query('etage').optional().isInt().toInt(),
    query('typeId').optional().isMongoId().withMessage('typeId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listAvailableBoxesController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box invalide')],
  validateRequest,
  getBoxController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id box invalide'),
    body('numero').optional().isString(),
    body('etage').optional().isInt(),
    body('zone').optional().isString(),
    body('allee').optional().isString(),
    body('position').optional().isString(),
    body('description').optional().isString(),
    body('superficie').optional().isFloat({ min: 0 }),
    body('typeId').optional().isMongoId().withMessage('typeId invalide'),
    body('caracteristiques').optional().isArray(),
    body('photos').optional().isArray(),
    body('estOccupe').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  updateBoxController,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box invalide')],
  validateRequest,
  deleteBoxController,
);

/**
 * @openapi
 * /boxes:
 *   post:
 *     tags: [Box]
 *     summary: Creer une box (avec type + tarif)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numero, etage, zone, superficie, typeId, montant, unite, dateDebut]
 *             properties:
 *               numero: { type: string }
 *               etage: { type: integer }
 *               zone: { type: string }
 *               allee: { type: string }
 *               position: { type: string }
 *               description: { type: string }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               photos:
 *                 type: array
 *                 items: { type: string }
 *               superficie: { type: number, minimum: 0 }
 *               typeId: { type: string }
 *               montant: { type: number, minimum: 0 }
 *               unite: { type: string, enum: [mois, annee] }
 *               dateDebut: { type: string, format: date-time }
 *               raison: { type: string }
 *     responses:
 *       201: { description: Box creee }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: BoxType introuvable }
 *   get:
 *     tags: [Box]
 *     summary: Lister les boxes (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: etage
 *         schema: { type: integer }
 *       - in: query
 *         name: typeId
 *         schema: { type: string }
 *       - in: query
 *         name: estOccupe
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Liste des boxes }
 *
 * /boxes/available:
 *   get:
 *     tags: [Box]
 *     summary: Lister les boxes disponibles (boutique)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: etage
 *         schema: { type: integer }
 *       - in: query
 *         name: typeId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Liste des boxes disponibles }
 *
 * /boxes/{id}:
 *   get:
 *     tags: [Box]
 *     summary: Recuperer une box (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Box }
 *       404: { description: Box introuvable }
 *   patch:
 *     tags: [Box]
 *     summary: Mettre a jour une box (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero: { type: string }
 *               etage: { type: integer }
 *               zone: { type: string }
 *               allee: { type: string }
 *               position: { type: string }
 *               description: { type: string }
 *               superficie: { type: number, minimum: 0 }
 *               typeId: { type: string }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               photos:
 *                 type: array
 *                 items: { type: string }
 *               estOccupe: { type: boolean }
 *     responses:
 *       200: { description: Box mise a jour }
 *       404: { description: Box introuvable }
 *   delete:
 *     tags: [Box]
 *     summary: Supprimer une box (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Box supprimee }
 *       404: { description: Box introuvable }
 *       409: { description: Box occupee }
 *
 * /boxes/{id}/tarif:
 *   patch:
 *     tags: [Box]
 *     summary: Mettre a jour le tarif d'une box
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
 *             required: [montant, unite, dateDebut]
 *             properties:
 *               montant: { type: number, minimum: 0 }
 *               unite: { type: string, enum: [mois, annee] }
 *               dateDebut: { type: string, format: date-time }
 *               raison: { type: string }
 *     responses:
 *       200: { description: Tarif box mis a jour }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Box introuvable }
 */

export default router;
