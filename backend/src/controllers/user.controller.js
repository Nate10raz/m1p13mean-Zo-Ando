import { changeMyPassword, getMyProfile, updateMyProfile } from '../services/user.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Gestion du compte utilisateur (profil, mot de passe)
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profil complet de l'utilisateur }
 *       401: { description: Non authentifié }
 */
export const getMyProfileController = async (req, res, next) => {
  try {
    const result = await getMyProfile(req.user?.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Profil utilisateur',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Mettre à jour le profil utilisateur
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               avatar: { type: string, description: "URL de l'avatar" }
 *               adresseLivraison: { type: string }
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: object
 *                     properties:
 *                       email: { type: boolean }
 *                       inApp: { type: boolean }
 *     responses:
 *       200: { description: Profil mis à jour }
 */
export const updateMyProfileController = async (req, res, next) => {
  try {
    const result = await updateMyProfile(req.user?.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Profil utilisateur mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Changer son mot de passe
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Mot de passe modifié avec succès }
 *       400: { description: Mot de passe actuel incorrect ou confirmation différente }
 */
export const changeMyPasswordController = async (req, res, next) => {
  try {
    const result = await changeMyPassword(req.user?.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Mot de passe modifie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
