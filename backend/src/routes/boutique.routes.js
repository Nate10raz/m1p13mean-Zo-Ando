import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import {
  getMyBoutiqueController,
  updateMyBoutiqueController,
  getBoutiqueByIdController,
  updateBoutiqueController,
  getBoutiqueSalesDashboardController,
  getMarketplaceFeeController,
  getSupermarketClosuresController,
} from '../controllers/boutique.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

router.get('/frais-livraison/supermarche', getMarketplaceFeeController);
router.get('/closures/supermarket', getSupermarketClosuresController);

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const boutiqueUpdateValidation = [
  body('nom').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('logo')
    .optional()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Logo URL invalide'),
  body('banner')
    .optional()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Banner URL invalide'),
  body('adresse').optional().isString(),
  body('horaires').optional().isArray(),
  body('horaires.*.jour').optional().isIn(daysOfWeek).withMessage('Jour invalide'),
  body('horaires.*.ouverture').optional().isString(),
  body('horaires.*.fermeture').optional().isString(),
  body('telephone').optional().isMobilePhone('any').withMessage('Telephone invalide'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('clickCollectActif').optional().isBoolean(),
  body('plage_livraison_boutique').optional().isArray(),
  body('plage_livraison_boutique.*.jour').optional().isIn(daysOfWeek).withMessage('Jour invalide'),
  body('plage_livraison_boutique.*.ouverture').optional().isString(),
  body('plage_livraison_boutique.*.fermeture').optional().isString(),
  body('plage_livraison_boutique.*.maxLivraison')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxLivraison invalide'),
  body('accepteLivraisonJourJ').optional().isBoolean(),
];

/**
 * @openapi
 * tags :
 *   - name : Boutiques
 *     description : Gestion des boutiques
 */

router.get('/me', requireAuth, requireRole('boutique'), getMyBoutiqueController);
router.put('/me', requireAuth, requireRole('boutique'), updateMyBoutiqueController);
router.patch(
  '/me',
  requireAuth,
  requireRole('boutique'),
  boutiqueUpdateValidation,
  validateRequest,
  updateMyBoutiqueController,
);

router.get('/:id', getBoutiqueByIdController);
router.put('/:id', requireAuth, updateBoutiqueController);

router.get(
  '/dashboard/ventes',
  requireAuth,
  requireRole('boutique'),
  [
    query('startDate').optional().isISO8601().withMessage('startDate invalide'),
    query('endDate').optional().isISO8601().withMessage('endDate invalide'),
    query('topN').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('granularity').optional().isIn(['day', 'week', 'month']),
  ],
  validateRequest,
  getBoutiqueSalesDashboardController,
);

/**
 * @openapi
 * /boutiques/me:
 *   get:
 *     tags: [Boutiques]
 *     summary: Recuperer la boutique de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Boutique }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 */

/**
 * @openapi
 * /boutiques/me:
 *   patch:
 *     tags: [Boutiques]
 *     summary: Mettre a jour la boutique de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               description: { type: string }
 *               logo: { type: string, format: uri }
 *               banner: { type: string, format: uri }
 *               adresse: { type: string }
 *               horaires: { type: array }
 *               telephone: { type: string }
 *               email: { type: string, format: email }
 *               clickCollectActif: { type: boolean }
 *               plage_livraison_boutique: { type: array }
 *               accepteLivraisonJourJ: { type: boolean }
 *     responses:
 *       200: { description: Boutique mise a jour }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 *//**
 * @openapi
 * /boutiques/me:
 *   patch:
 *     tags: [Boutiques]
 *     summary: Mettre a jour la boutique de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               description: { type: string }
 *               logo: { type: string, format: uri }
 *               banner: { type: string, format: uri }
 *               adresse: { type: string }
 *               horaires: { type: array }
 *               telephone: { type: string }
 *               email: { type: string, format: email }
 *               clickCollectActif: { type: boolean }
 *               plage_livraison_boutique: { type: array }
 *               accepteLivraisonJourJ: { type: boolean }
 *     responses:
 *       200: { description: Boutique mise a jour }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 */

/**
 * @openapi
 * /boutiques/dashboard/ventes:
 *   get:
 *     tags: [Boutiques]
 *     summary: Dashboard ventes et vue boutique
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: topN
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 *       - in: query
 *         name: granularity
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200: { description: Dashboard ventes boutique }
 */

export default router;
