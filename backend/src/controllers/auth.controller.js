import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { login, logoutSession, refreshSession } from '../services/auth.service.js';
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
      },
    });
  } catch (error) {
    if (error && error.status === 401) {
      clearRefreshCookie(res);
    }
    next(error);
  }
};

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
