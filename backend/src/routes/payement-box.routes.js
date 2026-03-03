import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createPayementBoxController,
  listPayementBoxesController,
  getPayementBoxController,
  updatePayementBoxController,
  deletePayementBoxController,
  listPayementBoxesPendingController,
  validatePayementBoxController,
  rejectPayementBoxController,
} from '../controllers/payement-box.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: PayementsBox
 *     description: Gestion des payements de loyer des box
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
  requireRole('admin', 'boutique'),
  [
    body('boxId').isMongoId().withMessage('boxId invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('montant invalide'),
    body('prixBoxeId').optional().isMongoId().withMessage('prixBoxeId invalide'),
    body('date').optional().isISO8601().withMessage('date invalide'),
    body('dueDate').optional().isISO8601().withMessage('dueDate invalide'),
    body('periode')
      .optional()
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage('periode invalide'),
    body('status')
      .optional()
      .isIn(['en_attente', 'valide', 'rejete'])
      .withMessage('status invalide'),
    body('commentaire').optional().isString(),
  ],
  validateRequest,
  createPayementBoxController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    query('status')
      .optional()
      .isIn(['en_attente', 'valide', 'rejete'])
      .withMessage('status invalide'),
    query('boxId').optional().isMongoId().withMessage('boxId invalide'),
    query('boutiqueId').optional().isMongoId().withMessage('boutiqueId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listPayementBoxesController,
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
  listPayementBoxesPendingController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  [param('id').isMongoId().withMessage('Id payement invalide')],
  validateRequest,
  getPayementBoxController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    param('id').isMongoId().withMessage('Id payement invalide'),
    body('montant').optional().isFloat({ min: 0 }).withMessage('montant invalide'),
    body('prixBoxeId').optional().isMongoId().withMessage('prixBoxeId invalide'),
    body('date').optional().isISO8601().withMessage('date invalide'),
    body('dueDate').optional().isISO8601().withMessage('dueDate invalide'),
    body('periode')
      .optional()
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage('periode invalide'),
    body('status')
      .optional()
      .isIn(['en_attente', 'valide', 'rejete'])
      .withMessage('status invalide'),
    body('commentaire').optional().isString(),
  ],
  validateRequest,
  updatePayementBoxController,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  [param('id').isMongoId().withMessage('Id payement invalide')],
  validateRequest,
  deletePayementBoxController,
);

router.patch(
  '/:id/validate',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id payement invalide'),
    body('commentaire').isString().notEmpty().withMessage('commentaire requis'),
  ],
  validateRequest,
  validatePayementBoxController,
);

router.patch(
  '/:id/reject',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id payement invalide'),
    body('commentaire').isString().notEmpty().withMessage('commentaire requis'),
  ],
  validateRequest,
  rejectPayementBoxController,
);

/**
 * @openapi
 * /payements-box:
 *   post:
 *     tags: [PayementsBox]
 *     summary: Creer un payement de box
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boxId, montant]
 *             properties:
 *               boxId: { type: string }
 *               montant: { type: number, minimum: 0 }
 *               prixBoxeId: { type: string }
 *               date: { type: string, format: date-time }
 *               dueDate: { type: string, format: date-time }
 *               periode: { type: string, example: "2026-02" }
 *               status: { type: string, enum: [en_attente, valide, rejete] }
 *               commentaire: { type: string }
 *     responses:
 *       201: { description: Payement cree }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Box introuvable }
 *       409: { description: Box non assignee }
 *   get:
 *     tags: [PayementsBox]
 *     summary: Lister les payements box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, valide, rejete] }
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
 *       200: { description: Liste des payements }
 *
 * /payements-box/pending:
 *   get:
 *     tags: [PayementsBox]
 *     summary: Lister les payements en attente (admin)
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
 *       200: { description: Payements en attente }
 *
 * /payements-box/{id}:
 *   get:
 *     tags: [PayementsBox]
 *     summary: Recuperer un payement de box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payement }
 *       404: { description: Payement introuvable }
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Mettre a jour un payement de box
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
 *               montant: { type: number, minimum: 0 }
 *               prixBoxeId: { type: string }
 *               date: { type: string, format: date-time }
 *               dueDate: { type: string, format: date-time }
 *               periode: { type: string, example: "2026-02" }
 *               status: { type: string, enum: [en_attente, valide, rejete] }
 *               commentaire: { type: string }
 *     responses:
 *       200: { description: Payement mis a jour }
 *       400: { description: Donnees invalides }
 *       404: { description: Payement introuvable }
 *   delete:
 *     tags: [PayementsBox]
 *     summary: Supprimer un payement de box
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payement supprime }
 *       404: { description: Payement introuvable }
 *
 * /payements-box/{id}/validate:
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Valider un payement de box (admin)
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
 *       200: { description: Payement valide }
 *       400: { description: Payement non validable }
 *       404: { description: Payement introuvable }
 *
 * /payements-box/{id}/reject:
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Rejeter un payement de box (admin)
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
 *       200: { description: Payement rejete }
 *       400: { description: Payement non rejetable }
 *       404: { description: Payement introuvable }
 */

export default router;
