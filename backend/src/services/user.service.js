import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';
import Panier from '../models/Panier.js';

const SALT_ROUNDS = 10;

const createError = (message, data = null) => {
  const err = new Error(message);
  err.data = data;
  return err;
};

const normalizeEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const requireString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createError(`Champ requis: ${field}`);
  }
};

const ensureUniqueEmail = async (email, session) => {
  const exists = await User.findOne({ email }).select('_id').session(session);
  if (exists) {
    throw createError('Email deja utilise');
  }
};

const sanitizeUser = (user) => {
  const { passwordHash, __v, ...safe } = user.toObject();
  return safe;
};

export const registerClient = async (payload) => {
  const email = normalizeEmail(payload.email);
  requireString(email, 'email');
  requireString(payload.password, 'password');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ensureUniqueEmail(email, session);

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = await User.create(
      [
        {
          email,
          passwordHash,
          role: 'client',
          nom: payload.nom,
          prenom: payload.prenom,
          telephone: payload.telephone,
        },
      ],
      { session },
    );

    const createdUser = user[0];

    const panier = await Panier.create(
      [
        {
          clientId: createdUser._id,
        },
      ],
      { session },
    );

    createdUser.panierId = panier[0]._id;
    await createdUser.save({ session });

    await session.commitTransaction();
    return {
      user: sanitizeUser(createdUser),
      panier: panier[0].toObject(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const registerBoutique = async (payload) => {
  const email = normalizeEmail(payload.email);
  requireString(email, 'email');
  requireString(payload.password, 'password');

  if (!payload.boutique || typeof payload.boutique !== 'object') {
    throw createError('Informations boutique manquantes');
  }

  requireString(payload.boutique.nom, 'boutique.nom');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ensureUniqueEmail(email, session);

    const boutiqueName = payload.boutique.nom.trim();
    const boutiqueExists = await Boutique.findOne({ nom: boutiqueName })
      .select('_id')
      .session(session);
    if (boutiqueExists) {
      throw createError('Nom de boutique deja utilise');
    }

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = await User.create(
      [
        {
          email,
          passwordHash,
          role: 'boutique',
          nom: payload.nom,
          prenom: payload.prenom,
          telephone: payload.telephone,
          avatar: payload.avatar,
          isEmailVerified: payload.isEmailVerified,
          status: 'en_attente',
          isActive: false,
        },
      ],
      { session },
    );

    const createdUser = user[0];

    const boutique = await Boutique.create(
      [
        {
          userId: createdUser._id,
          nom: boutiqueName,
          description: payload.boutique.description,
          logo: payload.boutique.logo,
          banner: payload.boutique.banner,
          adresse: payload.boutique.adresse,
          horaires: payload.boutique.horaires,
          clickCollectActif: payload.boutique.clickCollectActif,
          telephone: payload.boutique.telephone,
          email: payload.boutique.email,
          plage_livraison_boutique: payload.boutique.plage_livraison_boutique,
          accepteLivraisonJourJ: payload.boutique.accepteLivraisonJourJ,
          status: 'en_attente',
          isActive: false,
        },
      ],
      { session },
    );

    createdUser.boutiqueId = boutique[0]._id;
    await createdUser.save({ session });

    await session.commitTransaction();
    return {
      user: sanitizeUser(createdUser),
      boutique: boutique[0].toObject(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const registerAdmin = async (payload) => {
  const email = normalizeEmail(payload.email);
  requireString(email, 'email');
  requireString(payload.password, 'password');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ensureUniqueEmail(email, session);

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);

    const user = await User.create(
      [
        {
          email,
          passwordHash,
          role: 'admin',
          nom: payload.nom,
          prenom: payload.prenom,
          telephone: payload.telephone,
          isActive: true,
          status: 'active',
        },
      ],
      { session },
    );

    const createdUser = user[0];

    await session.commitTransaction();
    return {
      user: sanitizeUser(createdUser),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
