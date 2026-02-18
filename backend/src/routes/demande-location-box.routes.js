import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createDemandeLocationBoxController,
  listDemandesLocationBoxController,
  listMyDemandesLocationBoxController,
  listDemandesLocationBoxPendingController,
  getDemandeLocationBoxController,
  cancelDemandeLocationBoxController,
  approveDemandeLocationBoxController,
  rejectDemandeLocationBoxController,
} from '../controllers/demande-location-box.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: DemandesLocationBox
 *     description: Gestion des demandes de location de box
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
  requireRole('boutique'),
  [
    body('boxId').isMongoId().withMessage('boxId invalide'),
    body('dateDebut').isISO8601().withMessage('dateDebut invalide'),
  ],
  validateRequest,
  createDemandeLocationBoxController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    query('status')
      .optional()
      .isIn(['en_attente', 'validee', 'rejetee', 'annulee'])
      .withMessage('status invalide'),
    query('boxId').optional().isMongoId().withMessage('boxId invalide'),
    query('boutiqueId').optional().isMongoId().withMessage('boutiqueId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listDemandesLocationBoxController,
);

router.get(
  '/me',
  requireAuth,
  requireRole('boutique'),
  [
    query('status')
      .optional()
      .isIn(['en_attente', 'validee', 'rejetee', 'annulee'])
      .withMessage('status invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listMyDemandesLocationBoxController,
);

router.get(
  '/pending',
  requireAuth,
  requireRole('admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listDemandesLocationBoxPendingController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  [param('id').isMongoId().withMessage('Id demande invalide')],
  validateRequest,
  getDemandeLocationBoxController,
);

router.patch(
  '/:id/cancel',
  requireAuth,
  requireRole('boutique'),
  [param('id').isMongoId().withMessage('Id demande invalide')],
  validateRequest,
  cancelDemandeLocationBoxController,
);

router.patch(
  '/:id/approve',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id demande invalide'),
    body('commentaire').isString().notEmpty().withMessage('commentaire requis'),
  ],
  validateRequest,
  approveDemandeLocationBoxController,
);

router.patch(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id demande invalide'),
    body('commentaire').isString().notEmpty().withMessage('commentaire requis'),
  ],
  validateRequest,
  rejectDemandeLocationBoxController,
);

/**
 * @openapi
 * /demandes-location-box:
 *   post:
 *     tags: [DemandesLocationBox]
 *     summary: Creer une demande de location (boutique)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boxId, dateDebut]
 *             properties:
 *               boxId: { type: string }
 *               dateDebut: { type: string, format: date-time }
 *     responses:
 *       201: { description: Demande creee }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Box introuvable }
 *       409: { description: Conflit }
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Lister les demandes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, validee, rejetee, annulee] }
 *       - in: query
 *         name: boxId
 *         schema: { type: string }
 *       - in: query
 *         name: boutiqueId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Liste des demandes }
 *
 * /demandes-location-box/{id}:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Recuperer une demande
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Demande }
 *       404: { description: Demande introuvable }
 *
 * /demandes-location-box/{id}/cancel:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Annuler une demande (boutique)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Demande annulee }
 *       400: { description: Demande non annulable }
 *       404: { description: Demande introuvable }
 *
 * /demandes-location-box/{id}/approve:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Valider une demande (admin)
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
 *             required: [commentaire]
 *             properties:
 *               commentaire: { type: string }
 *     responses:
 *       200: { description: Demande validee }
 *       400: { description: Demande non validable }
 *       404: { description: Demande introuvable }
 *       409: { description: Box ou boutique deja occupee }
 *
 * /demandes-location-box/{id}/reject:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Rejeter une demande (admin)
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
 *             required: [commentaire]
 *             properties:
 *               commentaire: { type: string }
 *     responses:
 *       200: { description: Demande rejetee }
 *       400: { description: Demande non rejetable }
 *       404: { description: Demande introuvable }
 *
 * /demandes-location-box/me:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Lister mes demandes (boutique)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, validee, rejetee, annulee] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Mes demandes }
 *
 * /demandes-location-box/pending:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Lister les demandes en attente (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Demandes en attente }
 */

export default router;
