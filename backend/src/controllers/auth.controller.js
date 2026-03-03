import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import {
  login,
  loginWithGoogle,
  logoutSession,
  refreshSession,
  resetPasswordWithToken,
} from '../services/auth.service.js';
import { registerAdmin, registerBoutique, registerClient } from '../services/user.service.js';
import { apiResponse } from '../utils/response.util.js';

const buildRefreshCookieOptions = (refreshToken) => {
  const isProd = ENV.NODE_ENV === 'production';
  const decoded = jwt.decode(refreshToken);
  const expires = decoded && decoded.exp ? new Date(decoded.exp * 1000) : undefined;

  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/auth',
  };

  if (expires) {
    options.expires = expires;
  }

  return options;
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, buildRefreshCookieOptions(refreshToken));
};

const clearRefreshCookie = (res) => {
  const isProd = ENV.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/auth',
  });
};

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentification, inscription et gestion des sessions
 */

/**
 * @openapi
 * /auth/register/client:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription d'un nouveau client
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nom, prenom, telephone]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               avatar: { type: string, description: "URL de l'image de profil" }
 *     responses:
 *       201: { description: Inscription client réussie }
 *       400: { description: Email déjà utilisé ou données invalides }
 */
export const registerClientController = async (req, res, next) => {
  try {
    const result = await registerClient(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inscription client reussie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/register/boutique:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription d'une nouvelle boutique (en attente d'approbation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, nom, prenom, telephone, boutique]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               nom: { type: string, description: "Nom du propriétaire" }
 *               prenom: { type: string, description: "Prénom du propriétaire" }
 *               telephone: { type: string, description: "Téléphone du propriétaire" }
 *               boutique:
 *                 type: object
 *                 required: [nom]
 *                 properties:
 *                   nom: { type: string }
 *                   adresse: { type: string }
 *                   telephone: { type: string }
 *                   description: { type: string }
 *                   boxIds: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Inscription boutique réussie (en attente d'approbation) }
 *       400: { description: Données invalides }
 */
export const registerBoutiqueController = async (req, res, next) => {
  try {
    const result = await registerBoutique(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inscription boutique reussie, en attente d’approbation admin',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/register/admin:
 *   post:
 *     tags: [Auth]
 *     summary: Inscription d'un nouvel administrateur (protégée par secret)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, adminSecret]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               nom: { type: string }
 *               prenom: { type: string }
 *               telephone: { type: string }
 *               adminSecret: { type: string, description: "Code secret requis pour l'inscription admin" }
 *     responses:
 *       201: { description: Inscription admin réussie }
 *       403: { description: Secret invalide ou manquant }
 */
export const registerAdminController = async (req, res, next) => {
  try {
    const result = await registerAdmin(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inscription admin reussie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
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
 *       200:
 *         description: Connexion réussie
 *         headers:
 *           Set-Cookie:
 *             schema: { type: string, example: "refreshToken=abc...; HttpOnly; Path=/auth" }
 *       401: { description: Identifiants invalides }
 */
export const loginController = async (req, res, next) => {
  try {
    const result = await login(req.body);
    setRefreshCookie(res, result.refreshToken);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Connexion reussie',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Redirection vers Google OAuth
 *     responses:
 *       302: { description: Redirection vers Google SSO }
 *   post:
 *     tags: [Auth]
 *     summary: Connexion/Inscription via Google (idToken client-side)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken, role]
 *             properties:
 *               idToken: { type: string }
 *               role: { type: string, enum: [client] }
 *     responses:
 *       200: { description: Connexion Google réussie }
 */
export const googleLoginController = async (req, res, next) => {
  try {
    const result = await loginWithGoogle(req.body);
    if (result.refreshToken) {
      setRefreshCookie(res, result.refreshToken);
    }
    apiResponse({
      req,
      res,
      status: 200,
      message: result.message || 'Connexion Google reussie',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Callback Google OAuth (Server-side strategy)
 *     responses:
 *       302: { description: Redirection vers le frontend avec token }
 */

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rafraîchir le token d'accès
 *     description: Nécessite le refresh token envoyé via cookie HttpOnly.
 *     responses:
 *       200: { description: Nouveau token d'accès généré }
 *       401: { description: Refresh token invalide ou expiré }
 */
export const refreshController = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const result = await refreshSession(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Token rafraichi',
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    if (error && error.status === 401) {
      clearRefreshCookie(res);
    }
    next(error);
  }
};

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion de l'utilisateur
 *     description: Invalide la session et supprime le cookie refreshToken.
 *     responses:
 *       200: { description: Déconnexion réussie }
 */
export const logoutController = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await logoutSession(refreshToken);
    clearRefreshCookie(res);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Deconnexion reussie',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Réinitialiser le mot de passe via token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *               confirmPassword: { type: string }
 *     responses:
 *       200: { description: Mot de passe réinitialisé avec succès }
 *       400: { description: Token invalide ou expiré }
 */
export const resetPasswordController = async (req, res, next) => {
  try {
    const result = await resetPasswordWithToken(req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Mot de passe reinitialise',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
