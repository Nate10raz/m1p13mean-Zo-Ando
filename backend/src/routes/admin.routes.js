import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  approveBoutiqueController,
  listBoutiquesController,
  listPendingBoutiquesController,
  reactivateBoutiqueController,
  reactivateUserController,
  rejectBoutiqueController,
  suspendBoutiqueController,
  suspendUserController,
  listClientsController,
  getAdminFinanceDashboardController,
  getFraisLivraisonSupermarcheController,
  updateFraisLivraisonSupermarcheController,
  getFraisLivraisonHistoryController,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Actions d'administration
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const adminGuard = [requireAuth, requireRole('admin')];

router.patch(
  '/boutiques/:id/approve',
  ...adminGuard,
  [param('id').isMongoId().withMessage('Id boutique invalide')],
  validateRequest,
  approveBoutiqueController,
);

/**
 * @openapi
 * /admin/boutiques/{id}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approuver une boutique
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Boutique approuvee }
 */

router.patch(
  '/boutiques/:id/suspend',
  ...adminGuard,
  [
    param('id').isMongoId().withMessage('Id boutique invalide'),
    body('motif').isString().notEmpty().withMessage('Motif requis'),
  ],
  validateRequest,
  suspendBoutiqueController,
);

/**
 * @openapi
 * /admin/boutiques/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspendre une boutique
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
 *             required: [motif]
 *             properties:
 *               motif: { type: string }
 *     responses:
 *       200: { description: Boutique suspendue }
 */

router.patch(
  '/boutiques/:id/reject',
  ...adminGuard,
  [
    param('id').isMongoId().withMessage('Id boutique invalide'),
    body('motif').isString().notEmpty().withMessage('Motif requis'),
  ],
  validateRequest,
  rejectBoutiqueController,
);

/**
 * @openapi
 * /admin/boutiques/{id}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Rejeter une boutique
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
 *             required: [motif]
 *             properties:
 *               motif: { type: string }
 *     responses:
 *       200: { description: Boutique rejetee }
 */

router.patch(
  '/boutiques/:id/reactivate',
  ...adminGuard,
  [param('id').isMongoId().withMessage('Id boutique invalide')],
  validateRequest,
  reactivateBoutiqueController,
);

/**
 * @openapi
 * /admin/boutiques/{id}/reactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Reactiver une boutique
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Boutique reactivee }
 */

router.get(
  '/boutiques/pending',
  ...adminGuard,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['createdAt', 'nom', 'status']),
    query('sortDir').optional().isIn(['asc', 'desc']),
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('includeUser').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  listPendingBoutiquesController,
);

router.get(
  '/boutiques',
  ...adminGuard,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['createdAt', 'nom', 'status']),
    query('sortDir').optional().isIn(['asc', 'desc']),
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('includeUser').optional().isBoolean().toBoolean(),
    query('status')
      .optional()
      .isIn(['active', 'suspendue', 'en_attente', 'rejetee'])
      .withMessage('Status invalide'),
  ],
  validateRequest,
  listBoutiquesController,
);

/**
 * @openapi
 * /admin/boutiques:
 *   get:
 *     tags: [Admin]
 *     summary: Lister toutes les boutiques
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, nom, status] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeUser
 *         schema: { type: boolean }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspendue, en_attente, rejetee] }
 *     responses:
 *       200: { description: Liste boutiques }
 */

/**
 * @openapi
 * /admin/boutiques/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Lister les boutiques en attente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, nom, status] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeUser
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Boutiques en attente }
 */

router.patch(
  '/users/:id/suspend',
  ...adminGuard,
  [
    param('id').isMongoId().withMessage('Id utilisateur invalide'),
    body('motif').isString().notEmpty().withMessage('Motif requis'),
  ],
  validateRequest,
  suspendUserController,
);

/**
 * @openapi
 * /admin/users/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspendre un client
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
 *             required: [motif]
 *             properties:
 *               motif: { type: string }
 *     responses:
 *       200: { description: Utilisateur suspendu }
 */

router.patch(
  '/users/:id/reactivate',
  ...adminGuard,
  [param('id').isMongoId().withMessage('Id utilisateur invalide')],
  validateRequest,
  reactivateUserController,
);

/**
 * @openapi
 * /admin/users/{id}/reactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Reactiver un client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Utilisateur reactive }
 */

router.get(
  '/users',
  ...adminGuard,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isIn(['createdAt', 'nom', 'prenom', 'status']),
    query('sortDir').optional().isIn(['asc', 'desc']),
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('status')
      .optional()
      .isIn(['active', 'suspendue', 'en_attente', 'rejetee'])
      .withMessage('Status invalide'),
  ],
  validateRequest,
  listClientsController,
);

router.get(
  '/dashboard/finance',
  ...adminGuard,
  [
    query('startDate').optional().isISO8601().withMessage('startDate invalide'),
    query('endDate').optional().isISO8601().withMessage('endDate invalide'),
    query('topN').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validateRequest,
  getAdminFinanceDashboardController,
);

/**
 * @openapi
 * /admin/dashboard/finance:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard financier et KPI globaux
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
 *     responses:
 *       200: { description: Dashboard financier admin }
 */

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Lister les clients
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, nom, prenom, status] }
 *       - in: query
 *         name: sortDir
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspendue, en_attente, rejetee] }
 *     responses:
 *       200: { description: Liste clients }
 */

router.get('/frais-livraison-supermarche', ...adminGuard, getFraisLivraisonSupermarcheController);

router.post(
  '/frais-livraison-supermarche',
  ...adminGuard,
  [
    body('montant').isNumeric().withMessage('Le montant doit être un nombre'),
    body('type').optional().isIn(['fixe', 'pourcentage']).withMessage('Type invalide'),
    body('description').optional().isString(),
  ],
  validateRequest,
  updateFraisLivraisonSupermarcheController,
);

router.get(
  '/frais-livraison-supermarche/history',
  ...adminGuard,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
  ],
  validateRequest,
  getFraisLivraisonHistoryController,
);

export default router;
