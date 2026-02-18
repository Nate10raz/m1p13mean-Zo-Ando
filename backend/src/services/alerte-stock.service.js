import mongoose from 'mongoose';
import AlerteStock from '../models/AlerteStock.js';
import Produit from '../models/Produit.js';
import VariationProduit from '../models/VariationProduit.js';
import User from '../models/User.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const resolveBoutiqueAccess = async (auth, boutiqueId) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }
  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (boutiqueId && user.boutiqueId.toString() !== boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
    return user.boutiqueId;
  }
  return null;
};

const ensureVariationBelongs = async (variationId, produitId) => {
  if (!variationId) return null;
  if (!mongoose.Types.ObjectId.isValid(variationId)) {
    throw createError('variationId invalide', 400);
  }
  const variation = await VariationProduit.findOne({
    _id: variationId,
    produitId,
  })
    .select('_id')
    .lean();
  if (!variation) {
    throw createError('Variation introuvable', 404);
  }
  return variation._id;
};

export const createAlerteStock = async (payload, auth) => {
  const seuil = normalizeNumber(payload?.seuil);
  if (seuil === undefined || seuil < 0) {
    throw createError('seuil invalide', 400);
  }
  if (!payload?.produitId || !mongoose.Types.ObjectId.isValid(payload.produitId)) {
    throw createError('produitId invalide', 400);
  }

  const produit = await Produit.findById(payload.produitId).lean();
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  const boutiqueId = await resolveBoutiqueAccess(auth, produit.boutiqueId);
  const variationId = await ensureVariationBelongs(payload.variationId, produit._id);
  const targetBoutiqueId = boutiqueId || produit.boutiqueId;

  const existing = await AlerteStock.findOne({
    boutiqueId: targetBoutiqueId,
    produitId: produit._id,
    variationId: variationId ?? null,
  }).lean();
  if (existing) {
    throw createError('Alerte deja existante', 409);
  }

  const alerte = new AlerteStock({
    boutiqueId: targetBoutiqueId,
    produitId: produit._id,
    variationId: variationId ?? null,
    seuil,
    estActif: payload.estActif !== undefined ? Boolean(payload.estActif) : true,
  });

  await alerte.save();
  return alerte.toObject();
};

export const listAlerteStock = async (
  auth,
  { page = 1, limit = 20, produitId, variationId, estActif } = {},
) => {
  const boutiqueId = await resolveBoutiqueAccess(auth);
  const filter = {};
  if (boutiqueId) {
    filter.boutiqueId = boutiqueId;
  }
  if (produitId) {
    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      throw createError('produitId invalide', 400);
    }
    filter.produitId = produitId;
  }
  if (variationId) {
    if (!mongoose.Types.ObjectId.isValid(variationId)) {
      throw createError('variationId invalide', 400);
    }
    filter.variationId = variationId;
  }
  if (typeof estActif === 'boolean') {
    filter.estActif = estActif;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    AlerteStock.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    AlerteStock.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const getAlerteStockById = async (id, auth) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const alerte = await AlerteStock.findById(id).lean();
  if (!alerte) {
    throw createError('Alerte introuvable', 404);
  }

  const boutiqueId = await resolveBoutiqueAccess(auth, alerte.boutiqueId);
  if (boutiqueId && boutiqueId.toString() !== alerte.boutiqueId.toString()) {
    throw createError('Forbidden', 403);
  }

  return alerte;
};

export const updateAlerteStock = async (id, payload, auth) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const alerte = await AlerteStock.findById(id);
  if (!alerte) {
    throw createError('Alerte introuvable', 404);
  }

  const boutiqueId = await resolveBoutiqueAccess(auth, alerte.boutiqueId);
  if (boutiqueId && boutiqueId.toString() !== alerte.boutiqueId.toString()) {
    throw createError('Forbidden', 403);
  }

  if (payload.seuil !== undefined) {
    const seuil = normalizeNumber(payload.seuil);
    if (seuil === undefined || seuil < 0) {
      throw createError('seuil invalide', 400);
    }
    alerte.seuil = seuil;
  }

  if (payload.estActif !== undefined) {
    alerte.estActif = Boolean(payload.estActif);
  }

  await alerte.save();
  return alerte.toObject();
};

export const deleteAlerteStock = async (id, auth) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const alerte = await AlerteStock.findById(id);
  if (!alerte) {
    throw createError('Alerte introuvable', 404);
  }

  const boutiqueId = await resolveBoutiqueAccess(auth, alerte.boutiqueId);
  if (boutiqueId && boutiqueId.toString() !== alerte.boutiqueId.toString()) {
    throw createError('Forbidden', 403);
  }

  await AlerteStock.deleteOne({ _id: id });
  return { deleted: true };
};
