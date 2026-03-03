import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  getCategoryTreeController,
  listCategoriesController,
  seedCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';
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

const categoryValidation = [
  body('nom').isString().notEmpty().withMessage('Nom requis'),
  body('slug').isString().notEmpty().withMessage('Slug requis'),
  body('description').optional().isString(),
  body('image').optional().isString(),
  body('icon').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('parentId').optional().isMongoId().withMessage('parentId invalide'),
];

// Public
router.get('/', listCategoriesController);
router.get('/tree', getCategoryTreeController);
router.get('/:id', [param('id').isMongoId()], validateRequest, getCategoryController);

// Admin only
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  categoryValidation,
  validateRequest,
  createCategoryController,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId(), ...categoryValidation.map((v) => v.optional())],
  validateRequest,
  updateCategoryController,
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId(), query('force').optional().isBoolean()],
  validateRequest,
  deleteCategoryController,
);

// Dev tools
router.post('/seed', requireAuth, requireRole('admin'), seedCategoriesController);

export default router;
