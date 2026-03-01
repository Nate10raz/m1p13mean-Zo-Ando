import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  loginController,
  logoutController,
  refreshController,
  registerBoutiqueController,
  registerClientController,
  registerAdminController,
  resetPasswordController,
} from '../controllers/auth.controller.js';
import { ENV } from '../config/env.js';
import { badRequestResponse, forbiddenResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentification et inscription
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const requireAdminRegistrationSecret = (req, res, next) => {
  const expected = ENV.ADMIN_REGISTRATION_SECRET;
  if (!expected) {
    return forbiddenResponse(req, res, 'Admin registration disabled');
  }
  const provided = req.get('x-admin-secret') || req.body?.adminSecret;
  if (!provided || provided !== expected) {
    return forbiddenResponse(req, res, 'Invalid admin registration secret');
  }
  return next();
};

const baseUserValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6)'),
  body('nom').optional().isString(),
  body('prenom').optional().isString(),
  body('telephone').optional().isString(),
  body('avatar').optional().isString(),
  body('isEmailVerified').optional().isBoolean(),
];

const clientValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6)'),
  body('nom').isString().notEmpty().withMessage('Nom requis'),
  body('prenom').isString().notEmpty().withMessage('Prenom requis'),
  body('telephone').isString().notEmpty().withMessage('Telephone requis'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Mot de passe requis'),
];

const resetPasswordValidation = [
  body('token').isString().notEmpty().withMessage('Token requis'),
  body('newPassword')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Mot de passe trop court (min 6)'),
  body('confirmPassword')
    .optional()
    .isString()
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmation mot de passe invalide');
      }
      return true;
    }),
];
const adminValidation = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6)'),
  body('nom').optional().isString(),
  body('prenom').optional().isString(),
  body('telephone').optional().isString(),
];

const boutiqueValidation = [
  ...baseUserValidation,
  body('boutique').isObject().withMessage('Champ boutique requis'),
  body('boutique.nom').isString().notEmpty().withMessage('Nom boutique requis'),
  body('boutique.boxIds').optional().isArray().withMessage('boxIds invalide'),
  body('boutique.boxIds.*').isMongoId().withMessage('boxIds invalide'),
  body('boutique.description').optional().isString(),
  body('boutique.logo').optional().isString(),
  body('boutique.banner').optional().isString(),
  body('boutique.adresse').optional().isString(),
  body('boutique.telephone').optional().isString(),
  body('boutique.email').optional().isEmail(),
  body('boutique.clickCollectActif').optional().isBoolean(),
  body('boutique.accepteLivraisonJourJ').optional().isBoolean(),
  body('boutique.horaires').optional().isArray(),
  body('boutique.plage_livraison_boutique').optional().isArray(),
];

/**
 * @openapi
 * /auth/register/client:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription client
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nom, prenom, telephone]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *     responses:
 *       201: { description: Inscription client reussie }
 */
router.post('/register/client', clientValidation, validateRequest, registerClientController);

/**
 * @openapi
 * /auth/register/boutique:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription boutique
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nom, prenom, telephone, boutique]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               boutique:
 *                 type: object
 *                 required: [nom]
 *                 properties:
 *                   nom: { type: string }
 *                   adresse: { type: string }
 *                   telephone: { type: string }
 *     responses:
 *       201: { description: Inscription boutique reussie }
 */
router.post('/register/boutique', boutiqueValidation, validateRequest, registerBoutiqueController);
/**
 * @openapi
 * /auth/register/admin:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription admin (protegee par secret)
 *     security:
 *       - adminSecret: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *     responses:
 *       201: { description: Inscription admin reussie }
 *       403: { description: Secret invalide ou manquant }
 */
router.post(
  '/register/admin',
  requireAdminRegistrationSecret,
  adminValidation,
  validateRequest,
  registerAdminController,
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Connexion reussie }
 *       401: { description: Identifiants invalides }
 */
router.post('/login', loginValidation, validateRequest, loginController);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reinitialiser le mot de passe via un token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Mot de passe reinitialise }
 *       400: { description: Requete invalide }
 *       403: { description: Utilisateur non actif }
 *       404: { description: Utilisateur introuvable }
 */
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPasswordController);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rafraichir le token
 *     responses:
 *       200: { description: Token rafraichi }
 */
router.post('/refresh', refreshController);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Deconnexion
 *     responses:
 *       200: { description: Deconnexion reussie }
 */
router.post('/logout', logoutController);

export default router;
