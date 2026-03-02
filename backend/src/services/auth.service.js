import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import PasswordReset from '../models/PasswordReset.js';
import Panier from '../models/Panier.js';
import User from '../models/User.js';
import UserToken from '../models/UserToken.js';
import Boutique from '../models/Boutique.js';

const SALT_ROUNDS = 10;

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

const isTruthy = (value) => value === true || value === 'true' || value === 1 || value === '1';

const sanitizeUser = (user) => {
  const { passwordHash, __v, ...safe } = user.toObject();
  return safe;
};

const isGoogleAccount = (user) =>
  Boolean(user?.googleId) || user?.passwordHash === 'GOOGLE_OAUTH';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateJti = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

const verifyGoogleIdToken = async (idToken) => {
  if (!ENV.GOOGLE_CLIENT_ID) {
    throw createError('Google client not configured', 500);
  }

  try {
    const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
    });
    const data = response?.data || {};
    if (data.aud !== ENV.GOOGLE_CLIENT_ID) {
      throw createError('Invalid Google token', 401);
    }
    if (!data.email) {
      throw createError('No email in Google token', 400);
    }
    return data;
  } catch (error) {
    if (error?.status) {
      throw error;
    }
    throw createError('Invalid Google token', 401);
  }
};

export const signAccessToken = (user) => {
  const payload = { sub: user._id.toString(), role: user.role, type: 'access' };
  if (user.role === 'boutique' && user.boutiqueId) {
    payload.boutiqueId = user.boutiqueId.toString();
  }
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  });
};

export const signRefreshToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), type: 'refresh', jti: generateJti() },
    ENV.JWT_REFRESH_SECRET,
    {
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
    },
  );

export const getTokenExpiresAt = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.exp) {
    throw createError('Invalid token', 401);
  }
  return new Date(decoded.exp * 1000);
};

export const storeRefreshToken = async (userId, refreshToken) => {
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

export const loginWithGoogle = async (payload = {}) => {
  const idToken = payload?.idToken;
  const role = String(payload?.role || '').trim().toLowerCase();

  if (!idToken || typeof idToken !== 'string') {
    throw createError('Token Google requis', 400);
  }
  if (role !== 'client') {
    throw createError('Connexion Google reservee aux clients', 400);
  }

  const tokenInfo = await verifyGoogleIdToken(idToken);
  const email = normalizeEmail(tokenInfo.email);

  let user = await User.findOne({ email });
  let isNewUser = false;
  if (user) {
    if (user.role !== role) {
      throw createError('ROLE_MISMATCH', 403);
    }

    let changed = false;
    if (!user.googleId && tokenInfo.sub) {
      user.googleId = tokenInfo.sub;
      changed = true;
    }
    if (!user.avatar && tokenInfo.picture) {
      user.avatar = tokenInfo.picture;
      changed = true;
    }
    if (!user.nom && tokenInfo.family_name) {
      user.nom = tokenInfo.family_name;
      changed = true;
    }
    if (!user.prenom && tokenInfo.given_name) {
      user.prenom = tokenInfo.given_name;
      changed = true;
    }
    if (!user.isEmailVerified && isTruthy(tokenInfo.email_verified)) {
      user.isEmailVerified = true;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  } else {
    isNewUser = true;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdUsers = await User.create(
        [
          {
            email,
            passwordHash: 'GOOGLE_OAUTH',
            role: 'client',
            nom: tokenInfo.family_name || '',
            prenom: tokenInfo.given_name || '',
            telephone: '',
            avatar: tokenInfo.picture || '',
            googleId: tokenInfo.sub || null,
            isActive: true,
            status: 'active',
            isEmailVerified: isTruthy(tokenInfo.email_verified),
          },
        ],
        { session },
      );

      user = createdUsers[0];

      const panier = await Panier.create(
        [
          {
            clientId: user._id,
          },
        ],
        { session },
      );

      user.panierId = panier[0]._id;
      await user.save({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  if (!user) {
    throw createError('User not found', 404);
  }

  if (user.status && user.status !== 'active') {
    throw createError('User not active', 403);
  }
  if (user.isActive === false) {
    throw createError('User disabled', 403);
  }

  let accessToken = null;
  let refreshToken = null;

  accessToken = signAccessToken(user);
  refreshToken = signRefreshToken(user);
  await storeRefreshToken(user._id, refreshToken);

  let message = 'Connexion Google reussie';
  if (isNewUser) {
    message = 'Inscription Google reussie';
  }

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    message,
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

export const resetPasswordWithToken = async ({ token, newPassword }) => {
  if (!token || typeof token !== 'string') {
    throw createError('Token requis', 400);
  }
  if (!newPassword || typeof newPassword !== 'string') {
    throw createError('Mot de passe requis', 400);
  }
  if (newPassword.length < 6) {
    throw createError('Mot de passe trop court (min 6)', 400);
  }

  const tokenHash = hashToken(token);
  const resetRecord = await PasswordReset.findOne({ token: tokenHash, used: false });
  if (!resetRecord) {
    throw createError('Token invalide ou expire', 400);
  }
  if (resetRecord.expiresAt && resetRecord.expiresAt <= new Date()) {
    throw createError('Token invalide ou expire', 400);
  }

  const user = await User.findById(resetRecord.userId);
  if (!user) {
    throw createError('User not found', 404);
  }
  if (isGoogleAccount(user)) {
    throw createError('Mot de passe indisponible pour les comptes Google', 403);
  }
  if (user.status && user.status !== 'active') {
    throw createError('User not active', 403);
  }
  if (user.isActive === false) {
    throw createError('User disabled', 403);
  }

  const consumed = await PasswordReset.findOneAndUpdate(
    { _id: resetRecord._id, used: false },
    { used: true },
    { new: true },
  );
  if (!consumed) {
    throw createError('Token invalide ou deja utilise', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  await UserToken.deleteMany({ userId: user._id, type: 'refresh' });
  await PasswordReset.deleteMany({ userId: user._id, used: false });

  return {
    user: sanitizeUser(user),
  };
};
