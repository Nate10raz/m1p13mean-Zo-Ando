import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import {
  approveBoutiqueController,
  listPendingBoutiquesController,
} from '../controllers/admin.controller.js';
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

router.patch(
  '/boutiques/:id/approve',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id boutique invalide')],
  validateRequest,
  approveBoutiqueController,
);

router.get(
  '/boutiques/pending',
  requireAuth,
  requireRole('admin'),
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

export default router;
