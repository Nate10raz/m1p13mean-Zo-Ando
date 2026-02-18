import BoxType from '../models/BoxType.js';
import Box from '../models/Box.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertAdmin = (auth) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }
};

export const createBoxType = async (payload, auth) => {
  assertAdmin(auth);
  if (!payload?.nom) {
    throw createError('Nom requis', 400);
  }

  const boxType = new BoxType({
    nom: payload.nom,
    description: payload.description,
    caracteristiques: Array.isArray(payload.caracteristiques) ? payload.caracteristiques : [],
    estActif: payload.estActif !== undefined ? Boolean(payload.estActif) : true,
  });

  await boxType.save();
  return boxType.toObject();
};

export const listBoxTypes = async (auth, { page = 1, limit = 20, search, estActif } = {}) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }
  const filter = {};
  if (auth.role === 'boutique') {
    filter.estActif = true;
  }
  if (typeof estActif === 'boolean') {
    if (auth.role !== 'boutique') {
      filter.estActif = estActif;
    }
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ nom: regex }, { description: regex }];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    BoxType.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    BoxType.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const getBoxTypeById = async (id, auth) => {
  assertAdmin(auth);
  const boxType = await BoxType.findById(id).lean();
  if (!boxType) {
    throw createError('BoxType introuvable', 404);
  }
  return boxType;
};

export const updateBoxType = async (id, payload, auth) => {
  assertAdmin(auth);
  const boxType = await BoxType.findById(id);
  if (!boxType) {
    throw createError('BoxType introuvable', 404);
  }

  if (payload.nom !== undefined) boxType.nom = payload.nom;
  if (payload.description !== undefined) boxType.description = payload.description;
  if (payload.caracteristiques !== undefined) {
    if (!Array.isArray(payload.caracteristiques)) {
      throw createError('caracteristiques invalide', 400);
    }
    boxType.caracteristiques = payload.caracteristiques;
  }
  if (payload.estActif !== undefined) boxType.estActif = Boolean(payload.estActif);

  await boxType.save();
  return boxType.toObject();
};

export const deleteBoxType = async (id, auth) => {
  assertAdmin(auth);
  const boxType = await BoxType.findById(id);
  if (!boxType) {
    throw createError('BoxType introuvable', 404);
  }

  const used = await Box.exists({ typeId: id });
  if (used) {
    throw createError('Suppression impossible: type utilise par des boxes', 409);
  }

  await BoxType.deleteOne({ _id: id });
  return { deleted: true };
};
