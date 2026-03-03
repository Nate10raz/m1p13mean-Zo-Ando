import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createBoxController,
  updateBoxTarifController,
  listBoxesController,
  listAvailableBoxesController,
  listMyBoxesController,
  getBoxController,
  updateBoxController,
  deleteBoxController,
} from '../controllers/box.controller.js';
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
  '/:id/tarif',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id box invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('montant invalide'),
    body('unite').isIn(['mois', 'annee']).withMessage('unite invalide'),
    body('dateDebut').isISO8601().withMessage('dateDebut invalide'),
    body('raison').optional().isString(),
  ],
  validateRequest,
  updateBoxTarifController,
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('numero').isString().notEmpty().withMessage('numero requis'),
    body('etage').isInt().withMessage('etage invalide'),
    body('zone').isString().notEmpty().withMessage('zone requis'),
    body('superficie').isFloat({ min: 0 }).withMessage('superficie invalide'),
    body('typeId').isMongoId().withMessage('typeId invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('montant invalide'),
    body('unite').isIn(['mois', 'annee']).withMessage('unite invalide'),
    body('dateDebut').isISO8601().withMessage('dateDebut invalide'),
    body('raison').optional().isString(),
    body('allee').optional().isString(),
    body('position').optional().isString(),
    body('description').optional().isString(),
    body('caracteristiques').optional().isArray(),
    body('photos').optional().isArray(),
  ],
  validateRequest,
  createBoxController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('zone').optional().isString().trim().isLength({ min: 1 }),
    query('etage').optional().isInt().toInt(),
    query('typeId').optional().isMongoId().withMessage('typeId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('estOccupe').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  listBoxesController,
);

router.get(
  '/available',
  requireAuth,
  requireRole('boutique'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('zone').optional().isString().trim().isLength({ min: 1 }),
    query('etage').optional().isInt().toInt(),
    query('typeId').optional().isMongoId().withMessage('typeId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  listAvailableBoxesController,
);

router.get(
  '/me',
  requireAuth,
  requireRole('boutique'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('zone').optional().isString().trim().isLength({ min: 1 }),
    query('etage').optional().isInt().toInt(),
    query('typeId').optional().isMongoId().withMessage('typeId invalide'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('estOccupe').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  listMyBoxesController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box invalide')],
  validateRequest,
  getBoxController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('Id box invalide'),
    body('numero').optional().isString(),
    body('etage').optional().isInt(),
    body('zone').optional().isString(),
    body('allee').optional().isString(),
    body('position').optional().isString(),
    body('description').optional().isString(),
    body('superficie').optional().isFloat({ min: 0 }),
    body('typeId').optional().isMongoId().withMessage('typeId invalide'),
    body('caracteristiques').optional().isArray(),
    body('photos').optional().isArray(),
    body('estOccupe').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  updateBoxController,
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId().withMessage('Id box invalide')],
  validateRequest,
  deleteBoxController,
);

export default router;
