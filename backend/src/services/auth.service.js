import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import UserToken from '../models/UserToken.js';
import Boutique from '../models/Boutique.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const sanitizeUser = (user) => {
  const { passwordHash, __v, ...safe } = user.toObject();
  return safe;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateJti = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

const signAccessToken = (user) => {
  const payload = { sub: user._id.toString(), role: user.role, type: 'access' };
  if (user.role === 'boutique' && user.boutiqueId) {
    payload.boutiqueId = user.boutiqueId.toString();
  }
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  });
};

const signRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), type: 'refresh', jti: generateJti() },
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
    },
  );

const getTokenExpiresAt = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) {
    throw createError('Invalid token', 401);
  }
  return new Date(decoded.exp * 1000);
};

const storeRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getTokenExpiresAt(refreshToken);
  await UserToken.create({
    userId,
    tokenHash,
    type: 'refresh',
    expiresAt,
  });
};

const verifyRefreshToken = (refreshToken) => {
  try {
    return jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);
  } catch (error) {
    throw createError('Invalid refresh token', 401);
  }
};

export const login = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw createError('Email and password required', 400);
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  if (user.status && user.status !== 'active') {
    throw createError('User not active', 403);
  }

  if (user.isActive === false) {
    throw createError('User disabled', 403);
  }

  if (user.role === 'boutique') {
    const boutique = user.boutiqueId
      ? await Boutique.findById(user.boutiqueId)
      : await Boutique.findOne({ userId: user._id });
    if (!boutique) {
      throw createError('Boutique not found', 403);
    }
    if (boutique.isActive === false || boutique.status !== 'active') {
      throw createError('Boutique not approved', 403);
    }
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createError('Invalid credentials', 401);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken(user._id, refreshToken);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw createError('Missing refresh token', 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  if (payload.type && payload.type !== 'refresh') {
    throw createError('Invalid refresh token', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await UserToken.findOne({
    userId: payload.sub,
    tokenHash,
    type: 'refresh',
  });
  if (!storedToken) {
    throw createError('Invalid refresh token', 401);
  }

  await UserToken.deleteOne({ _id: storedToken._id });

  const user = await User.findById(payload.sub);
  if (!user) {
    throw createError('User not found', 401);
  }
  if (user.status && user.status !== 'active') {
    throw createError('User not active', 403);
  }
  if (user.isActive === false) {
    throw createError('User disabled', 403);
  }

  if (user.role === 'boutique') {
    const boutique = user.boutiqueId
      ? await Boutique.findById(user.boutiqueId)
      : await Boutique.findOne({ userId: user._id });
    if (!boutique) {
      throw createError('Boutique not found', 403);
    }
    if (boutique.isActive === false || boutique.status !== 'active') {
      throw createError('Boutique not approved', 403);
    }
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  await storeRefreshToken(user._id, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutSession = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }
  const tokenHash = hashToken(refreshToken);
  await UserToken.deleteOne({ tokenHash, type: 'refresh' });
};
