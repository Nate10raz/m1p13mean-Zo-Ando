import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  approveBoutiqueController,
  listBoutiquesController,
  listPendingBoutiquesController,
  reactivateBoutiqueController,
  reactivateUserController,
  rejectBoutiqueController,
  suspendBoutiqueController,
  suspendUserController,
  getUserByIdController,
  listClientsController,
  getAdminFinanceDashboardController,
  getFraisLivraisonSupermarcheController,
  updateFraisLivraisonSupermarcheController,
  getFraisLivraisonHistoryController,
  resetUserPasswordController,
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

router.use(requireAuth);
router.use(requireRole('admin'));

// --- Boutiques Management ---
router.get('/boutiques/pending', listPendingBoutiquesController);
router.get('/boutiques', listBoutiquesController);
router.patch('/boutiques/:id/approve', approveBoutiqueController);
router.patch(
  '/boutiques/:id/reject',
  [body('motif').notEmpty()],
  validateRequest,
  rejectBoutiqueController,
);
router.patch(
  '/boutiques/:id/suspend',
  [body('motif').notEmpty()],
  validateRequest,
  suspendBoutiqueController,
);
router.patch('/boutiques/:id/reactivate', reactivateBoutiqueController);

// --- Users Management ---
router.get('/users', listClientsController);
router.get('/users/:id', getUserByIdController);
router.patch(
  '/users/:id/suspend',
  [body('motif').notEmpty()],
  validateRequest,
  suspendUserController,
);
router.patch('/users/:id/reactivate', reactivateUserController);
router.patch('/users/:id/password', resetUserPasswordController);

// --- Finance & Config ---
router.get('/dashboard/finance', getAdminFinanceDashboardController);
router.get('/frais-livraison-supermarche', getFraisLivraisonSupermarcheController);
router.post(
  '/frais-livraison-supermarche',
  [body('montant').isNumeric()],
  validateRequest,
  updateFraisLivraisonSupermarcheController,
);
router.get('/frais-livraison-supermarche/history', getFraisLivraisonHistoryController);

export default router;
