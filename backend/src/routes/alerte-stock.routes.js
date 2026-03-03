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

export default router;
