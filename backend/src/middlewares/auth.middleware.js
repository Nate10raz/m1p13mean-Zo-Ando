import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { unauthorizedResponse } from '../utils/response.util.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse(req, res, 'Missing or invalid authorization header');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return unauthorizedResponse(req, res, 'Missing access token');
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return unauthorizedResponse(req, res, 'Invalid or expired access token');
  }
};
