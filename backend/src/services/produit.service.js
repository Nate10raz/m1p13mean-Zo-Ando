import mongoose from 'mongoose';
import Produit from '../models/Produit.js';
import Boutique from '../models/Boutique.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureUniqueSlug = async (baseSlug, boutiqueId) => {
  let slug = baseSlug;
  let counter = 1;
  while (await Produit.exists({ boutiqueId, slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
};

const parseMaybeJson = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const normalizeStringArray = (value) => {
  if (value === undefined || value === null) return undefined;
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
};

const normalizeObject = (value) => {
  const parsed = parseMaybeJson(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  return undefined;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveBoutiqueId = async (payload, auth) => {
  let boutiqueId = payload.boutiqueId;

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (boutiqueId && user.boutiqueId.toString() !== boutiqueId.toString()) {
      console.log('boutiqueId : ', boutiqueId);
      console.log('user boutiqueId : ', user.boutiqueId.toString());
      throw createError('Boutique invalide pour cet utilisateur', 403);
    }
    boutiqueId = user.boutiqueId;
  }

  if (!boutiqueId) {
    throw createError('boutiqueId requis', 400);
  }

  return new mongoose.Types.ObjectId(boutiqueId);
};

export const createProduit = async (payload, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const boutiqueId = await resolveBoutiqueId(payload, auth);

  const boutique = await Boutique.findById(boutiqueId).lean();
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }

  const rawSlug = payload.slug ? String(payload.slug) : slugify(payload.titre);
  if (!rawSlug) {
    throw createError('Slug invalide', 400);
  }
  const slug = await ensureUniqueSlug(rawSlug, boutiqueId);

  const sku =
    typeof payload.sku === 'string' && payload.sku.trim() === '' ? undefined : payload.sku;

  const tags = normalizeStringArray(payload.tags) ?? [];
  const sousCategoriesIds = normalizeStringArray(payload.sousCategoriesIds) ?? [];
  const attributs = parseMaybeJson(payload.attributs);
  const stock = normalizeObject(payload.stock);

  const images = Array.isArray(payload.images) ? payload.images : [];

  const produit = new Produit({
    boutiqueId,
    sku,
    titre: payload.titre,
    slug,
    description: payload.description,
    descriptionCourte: payload.descriptionCourte,
    categorieId: payload.categorieId,
    sousCategoriesIds,
    tags,
    images,
    hasVariations: Boolean(payload.hasVariations),
    attributs: Array.isArray(attributs) ? attributs : undefined,
    prixBaseActuel: normalizeNumber(payload.prixBaseActuel),
    stock: stock || undefined,
    estActif: payload.estActif !== undefined ? Boolean(payload.estActif) : true,
  });

  await produit.save();
  return produit.toObject();
};

export const getProduitById = async (productId, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const produit = await Produit.findById(productId).populate('boutiqueId', 'nom').lean();
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    const boutiqueId = produit.boutiqueId?._id ?? produit.boutiqueId;
    if (boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }

  const boutique =
    produit.boutiqueId && typeof produit.boutiqueId === 'object'
      ? {
          _id: produit.boutiqueId._id?.toString?.() ?? produit.boutiqueId._id,
          nom: produit.boutiqueId.nom,
        }
      : undefined;

  return {
    ...produit,
    boutiqueId:
      produit.boutiqueId && typeof produit.boutiqueId === 'object'
        ? produit.boutiqueId._id
        : produit.boutiqueId,
    boutique,
  };
};

export const listProduits = async (auth, { page = 1, limit = 20, search, estActif } = {}) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const filter = {};

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    filter.boutiqueId = user.boutiqueId;
  }

  if (typeof estActif === 'boolean') {
    filter.estActif = estActif;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ titre: regex }, { slug: regex }];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Produit.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    Produit.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const removeProduitImage = async (productId, imageId, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const produit = await Produit.findById(productId);
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (produit.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }

  const imageIndex = produit.images.findIndex(
    (image) => image?._id?.toString() === imageId.toString(),
  );
  if (imageIndex === -1) {
    throw createError('Image introuvable', 404);
  }

  const targetImage = produit.images[imageIndex];
  if (targetImage?.publicId) {
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      throw createError('Cloudinary configuration is missing', 500);
    }
    try {
      await cloudinary.uploader.destroy(targetImage.publicId, { resource_type: 'image' });
    } catch (error) {
      throw createError('Echec suppression image Cloudinary', 500);
    }
  }

  const [removed] = produit.images.splice(imageIndex, 1);

  if (removed?.isMain && produit.images.length > 0) {
    produit.images.forEach((image, index) => {
      image.isMain = index === 0;
    });
  }

  produit.images.forEach((image, index) => {
    image.ordre = index + 1;
  });

  await produit.save();
  return produit.toObject();
};

export const setProduitMainImage = async (productId, imageId, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const produit = await Produit.findById(productId);
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (produit.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }

  const imageIndex = produit.images.findIndex(
    (image) => image?._id?.toString() === imageId.toString(),
  );
  if (imageIndex === -1) {
    throw createError('Image introuvable', 404);
  }

  const targetImage = produit.images[imageIndex];
  const remaining = produit.images.filter((_, index) => index !== imageIndex);
  const reordered = [targetImage, ...remaining];

  reordered.forEach((image, index) => {
    image.isMain = index === 0;
    image.ordre = index + 1;
  });

  produit.images = reordered;
  await produit.save();
  return produit.toObject();
};

export const updateProduitStockAlert = async (productId, payload, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const produit = await Produit.findById(productId);
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (produit.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }

  const seuilAlerte = normalizeNumber(payload?.seuilAlerte);
  if (seuilAlerte === undefined || seuilAlerte === null) {
    throw createError('seuilAlerte invalide', 400);
  }
  if (seuilAlerte < 0) {
    throw createError('seuilAlerte invalide', 400);
  }

  const stock = produit.stock && typeof produit.stock === 'object' ? produit.stock : {};
  produit.stock = {
    ...stock,
    seuilAlerte,
  };

  await produit.save();
  return produit.toObject();
};

export const updateProduitStockAlertBulk = async (payload, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const rawIds = payload?.ids;
  const ids = Array.isArray(rawIds) ? rawIds : normalizeStringArray(rawIds);
  const categorieId = payload?.categorieId;

  if ((!ids || !ids.length) && !categorieId) {
    throw createError('ids ou categorieId requis', 400);
  }

  if (ids && ids.length) {
    const invalid = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalid.length) {
      throw createError('ids invalides', 400, { invalid });
    }
  }

  if (categorieId && !mongoose.Types.ObjectId.isValid(categorieId)) {
    throw createError('categorieId invalide', 400);
  }

  const seuilAlerte = normalizeNumber(payload?.seuilAlerte);
  if (seuilAlerte === undefined || seuilAlerte === null) {
    throw createError('seuilAlerte invalide', 400);
  }
  if (seuilAlerte < 0) {
    throw createError('seuilAlerte invalide', 400);
  }

  const filter = {};
  if (ids && ids.length) {
    filter._id = { $in: ids };
  }
  if (categorieId) {
    filter.categorieId = categorieId;
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    filter.boutiqueId = user.boutiqueId;
  }

  const result = await Produit.updateMany(filter, {
    $set: { 'stock.seuilAlerte': seuilAlerte },
  });

  return {
    matchedCount: result.matchedCount ?? result.n ?? 0,
    modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
  };
};

export const updateProduit = async (productId, payload, auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const produit = await Produit.findById(productId);
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  let boutiqueId = produit.boutiqueId;
  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    if (payload.boutiqueId && user.boutiqueId.toString() !== payload.boutiqueId.toString()) {
      throw createError('Boutique invalide pour cet utilisateur', 403);
    }
    if (produit.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
    boutiqueId = user.boutiqueId;
  } else if (payload.boutiqueId) {
    boutiqueId = payload.boutiqueId;
  }

  if (boutiqueId && boutiqueId.toString() !== produit.boutiqueId.toString()) {
    const boutique = await Boutique.findById(boutiqueId).lean();
    if (!boutique) {
      throw createError('Boutique introuvable', 404);
    }
    produit.boutiqueId = boutiqueId;
  }

  if (payload.titre !== undefined) {
    produit.titre = payload.titre;
  }

  if (payload.slug !== undefined) {
    const slug = String(payload.slug || '').trim();
    if (!slug) {
      throw createError('Slug invalide', 400);
    }
    produit.slug = slug;
  }

  if (payload.description !== undefined) {
    produit.description = payload.description;
  }

  if (payload.descriptionCourte !== undefined) {
    produit.descriptionCourte = payload.descriptionCourte;
  }

  if (payload.categorieId !== undefined) {
    produit.categorieId = payload.categorieId;
  }

  if (payload.sousCategoriesIds !== undefined) {
    produit.sousCategoriesIds = normalizeStringArray(payload.sousCategoriesIds) ?? [];
  }

  if (payload.tags !== undefined) {
    produit.tags = normalizeStringArray(payload.tags) ?? [];
  }

  if (payload.attributs !== undefined) {
    const attributs = parseMaybeJson(payload.attributs);
    produit.attributs = Array.isArray(attributs) ? attributs : [];
  }

  if (payload.prixBaseActuel !== undefined) {
    produit.prixBaseActuel = normalizeNumber(payload.prixBaseActuel);
  }

  if (payload.stock !== undefined) {
    produit.stock = normalizeObject(payload.stock) || undefined;
  }

  if (payload.hasVariations !== undefined) {
    produit.hasVariations = Boolean(payload.hasVariations);
  }

  if (payload.estActif !== undefined) {
    produit.estActif = Boolean(payload.estActif);
  }

  if (payload.sku !== undefined) {
    produit.sku =
      typeof payload.sku === 'string' && payload.sku.trim() === '' ? undefined : payload.sku;
  }

  const newImages = Array.isArray(payload.images) ? payload.images : [];
  if (newImages.length) {
    const replaceImages =
      payload.replaceImages === true ||
      payload.replaceImages === 'true' ||
      payload.replaceImages === 1 ||
      payload.replaceImages === '1';

    if (replaceImages) {
      produit.images = newImages.map((image, index) => ({
        ...image,
        ordre: index + 1,
        isMain: index === 0,
      }));
    } else {
      const existing = Array.isArray(produit.images) ? [...produit.images] : [];
      const startIndex = existing.length;
      const appended = newImages.map((image, index) => ({
        ...image,
        ordre: startIndex + index + 1,
        isMain: existing.length === 0 && index === 0,
      }));
      produit.images = [...existing, ...appended];
    }
  }

  await produit.save();
  return produit.toObject();
};
