import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  changeMyPasswordController,
  getMyProfileController,
  updateMyProfileController,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const updateValidation = [
  body('nom').optional().isString(),
  body('prenom').optional().isString(),
  body('telephone').optional().isMobilePhone('any').withMessage('Telephone invalide'),
  body('avatar')
    .optional()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Avatar URL invalide'),
  body('adresseLivraison').optional().isString(),
  body('preferences').optional().isObject(),
  body('preferences.notifications').optional().isObject(),
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.inApp').optional().isBoolean(),
];

const passwordChangeValidation = [
  body('currentPassword').isString().notEmpty().withMessage('Mot de passe actuel requis'),
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

router.get('/me', requireAuth, getMyProfileController);
router.patch('/me', requireAuth, updateValidation, validateRequest, updateMyProfileController);
router.patch(
  '/me/password',
  requireAuth,
  passwordChangeValidation,
  validateRequest,
  changeMyPasswordController,
);

export default router;
