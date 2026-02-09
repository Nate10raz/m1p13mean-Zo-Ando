import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  registerBoutiqueController,
  registerClientController,
} from '../controllers/auth.controller.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
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

const boutiqueValidation = [
  ...baseUserValidation,
  body('boutique').isObject().withMessage('Champ boutique requis'),
  body('boutique.nom').isString().notEmpty().withMessage('Nom boutique requis'),
  body('boutique.boxId').optional().isMongoId().withMessage('boxId invalide'),
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

router.post('/register/client', clientValidation, validateRequest, registerClientController);
router.post('/register/boutique', boutiqueValidation, validateRequest, registerBoutiqueController);

export default router;
