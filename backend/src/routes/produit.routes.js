import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createProduitController,
  getProduitController,
  listProduitsController,
  getLandingProduitsController,
  updateProduitController,
  deleteProduitImageController,
  setProduitMainImageController,
  updateProduitStockAlertController,
  updateProduitStockAlertBulkController,
} from '../controllers/produit.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';
import { productImageUpload } from '../middlewares/upload.middleware.js';

const router = Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const productValidation = [
  body('titre').optional().isString().notEmpty(),
  body('prixBaseActuel').optional().isNumeric(),
  body('boutiqueId').optional().isMongoId(),
];

// Public
router.get('/landing', getLandingProduitsController);
router.get('/', listProduitsController);
router.get('/:id', [param('id').isMongoId()], validateRequest, getProduitController);

// Protected (Boutique/Admin)
router.post(
  '/',
  requireAuth,
  requireRole(['boutique', 'admin']),
  productImageUpload.array('images', 5),
  productValidation,
  validateRequest,
  createProduitController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(['boutique', 'admin']),
  [param('id').isMongoId()],
  productImageUpload.array('images', 5),
  productValidation,
  validateRequest,
  updateProduitController,
);

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole(['boutique', 'admin']),
  [param('id').isMongoId()],
  validateRequest,
  deleteProduitImageController,
);

router.patch(
  '/:id/images/:imageId/main',
  requireAuth,
  requireRole(['boutique', 'admin']),
  [param('id').isMongoId()],
  validateRequest,
  setProduitMainImageController,
);

// Stock alerts
router.patch(
  '/stock-alert/bulk',
  requireAuth,
  requireRole(['boutique', 'admin']),
  [body('seuilAlerte').isNumeric()],
  validateRequest,
  updateProduitStockAlertBulkController,
);

router.patch(
  '/:id/stock-alert',
  requireAuth,
  requireRole(['boutique', 'admin']),
  [param('id').isMongoId(), body('seuilAlerte').isNumeric()],
  validateRequest,
  updateProduitStockAlertController,
);

export default router;
