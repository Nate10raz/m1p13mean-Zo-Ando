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

export default router;
