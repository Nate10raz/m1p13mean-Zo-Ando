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

export default router;
