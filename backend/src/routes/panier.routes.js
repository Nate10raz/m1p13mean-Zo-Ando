import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
    getPanierController,
    addToPanierController,
    updateQuantityController,
    removeFromPanierController,
    clearPanierController
} from '../controllers/panier.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return badRequestResponse(req, res, 'Erreur de validation', errors.array());
    }
    return next();
};

// Toutes les routes du panier nécessitent d'être client (ou au moins authentifié)
router.use(requireAuth);
router.use(requireRole('client'));

router.get('/', getPanierController);

router.post('/add', [
    body('produitId').isMongoId().withMessage('produitId invalide'),
    body('variationId').optional().isMongoId().withMessage('variationId invalide'),
    body('quantite').optional().isInt({ min: 1 }).toInt(),
], validateRequest, addToPanierController);

router.put('/update', [
    body('produitId').isMongoId().withMessage('produitId invalide'),
    body('variationId').optional().isMongoId().withMessage('variationId invalide'),
    body('quantite').isInt({ min: 0 }).toInt(),
], validateRequest, updateQuantityController);

router.post('/remove', [
    body('produitId').isMongoId().withMessage('produitId invalide'),
    body('variationId').optional().isMongoId().withMessage('variationId invalide'),
], validateRequest, removeFromPanierController);

router.delete('/clear', clearPanierController);

export default router;
