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

export default router;
