import mongoose from 'mongoose';
import Produit from '../models/Produit.js';
import Boutique from '../models/Boutique.js';
import User from '../models/User.js';
import AlerteStock from '../models/AlerteStock.js';
import Commande from '../models/Commande.js';
import { createNotification } from './notification.service.js';
import VariationProduit from '../models/VariationProduit.js';
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

const clampLandingLimit = (value, fallback = 6) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(6, parsed));
};

const buildVariationStockSet = async (produits) => {
  const ids = produits
    .filter((produit) => produit?.hasVariations)
    .map((produit) => produit._id)
    .filter(Boolean);

  if (!ids.length) {
    return new Set();
  }

  const rows = await VariationProduit.aggregate([
    { $match: { produitId: { $in: ids }, isActive: true, stock: { $gt: 0 } } },
    { $group: { _id: '$produitId' } },
  ]);

  return new Set(rows.map((row) => row._id.toString()));
};

const isProduitInStock = (produit, variationStockSet) => {
  if (!produit) return false;
  if (produit.hasVariations) {
    return variationStockSet.has(produit._id.toString());
  }
  const qty = produit?.stock?.quantite;
  return typeof qty === 'number' && qty > 0;
};

const pickInStockProducts = async ({ filter, sort, limit, excludeIds = [] } = {}) => {
  if (!limit || limit < 1) return [];

  const candidateLimit = Math.max(limit * 5, 20);
  const queryFilter = { ...filter };
  if (excludeIds.length) {
    queryFilter._id = { $nin: excludeIds };
  }

  const candidates = await Produit.find(queryFilter).sort(sort).limit(candidateLimit).lean();
  if (!candidates.length) return [];

  const variationStockSet = await buildVariationStockSet(candidates);
  const excludeSet = new Set(excludeIds.map((id) => id.toString()));

  const results = [];
  for (const produit of candidates) {
    if (excludeSet.has(produit._id.toString())) continue;
    if (!isProduitInStock(produit, variationStockSet)) continue;
    results.push(produit);
    if (results.length >= limit) break;
  }

  return results;
};

const triggerStockAlertIfNeeded = async ({
  produitId,
  boutiqueId,
  variationId = null,
  stockBefore,
  stockAfter,
  produitTitre,
}) => {
  if (stockAfter === undefined || stockAfter === null) {
    return;
  }

  const alerte = await AlerteStock.findOne({
    boutiqueId,
    produitId,
    variationId: variationId ?? null,
    estActif: true,
  }).lean();

  if (!alerte) {
    return;
  }

  if (stockAfter > alerte.seuil) {
    return;
  }

  if (stockBefore !== undefined && stockBefore !== null && stockBefore <= alerte.seuil) {
    return;
  }

  const boutique = await Boutique.findById(boutiqueId).select('userId nom').lean();
  if (!boutique || !boutique.userId) {
    return;
  }

  const variationSuffix = variationId ? ' (variation)' : '';
  const message = `Stock bas pour ${produitTitre || 'produit'}${variationSuffix}. Seuil ${alerte.seuil}, stock ${stockAfter}.`;

  await createNotification({
    userId: boutique.userId,
    type: 'stock_alert',
    channel: 'in_app',
    titre: 'Alerte stock',
    message,
    data: {
      produitId,
      boutiqueId,
      variationId,
    },
  });

  await AlerteStock.updateOne({ _id: alerte._id }, { $set: { dernierDeclenchement: new Date() } });
};

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

const sanitizeProduitForClient = (produit) => {
  if (!produit) return produit;

  let boutique = undefined;
  if (produit.boutiqueId && typeof produit.boutiqueId === 'object') {
    const b = produit.boutiqueId;
    boutique = {
      _id: b._id,
      nom: b.nom,
      isActive: b.isActive,
      isOpen: b.isOpen,
      statusReason: b.statusReason,
    };
  }

  let categorie = undefined;
  if (produit.categorieId && typeof produit.categorieId === 'object') {
    categorie = {
      _id: produit.categorieId._id,
      nom: produit.categorieId.nom,
    };
  }

  return {
    _id: produit._id,
    titre: produit.titre,
    slug: produit.slug,
    description: produit.description,
    descriptionCourte: produit.descriptionCourte,
    categorieId:
      produit.categorieId && typeof produit.categorieId === 'object'
        ? produit.categorieId._id
        : produit.categorieId,
    categorie,
    sousCategoriesIds: produit.sousCategoriesIds,
    tags: produit.tags,
    images: produit.images,
    hasVariations: produit.hasVariations,
    attributs: produit.attributs,
    prixBaseActuel: produit.prixBaseActuel,
    noteMoyenne: produit.noteMoyenne,
    nombreAvis: produit.nombreAvis,
    createdAt: produit.createdAt,
    updatedAt: produit.updatedAt,
    publishedAt: produit.publishedAt,
    boutique,
  };
};

export const getProduitById = async (productId, auth) => {
  if (!auth || !['admin', 'boutique', 'client'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const query = Produit.findById(productId)
    .populate('boutiqueId', 'nom isActive manualSwitchOpen horaires fermeturesExceptionnelles')
    .populate('categorieId', 'nom');

  const produit = await query;
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await User.findById(auth.userId).lean();
    if (!user || !user.boutiqueId) {
      throw createError('Boutique utilisateur introuvable', 404);
    }
    const bId = produit.boutiqueId?._id ?? produit.boutiqueId;
    if (bId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }

  if (auth.role === 'client') {
    const json = produit.toJSON({ virtuals: true });
    return sanitizeProduitForClient(json);
  }

  return produit.toObject({ virtuals: true });
};

export const listProduits = async (
  auth,
  { page = 1, limit = 20, search, estActif, categorieId, minPrix, maxPrix, sort } = {},
) => {
  if (!auth || !['admin', 'boutique', 'client'].includes(auth.role)) {
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

  if (categorieId) {
    filter.categorieId = categorieId;
  }

  const parsedMinPrix = normalizeNumber(minPrix);
  const parsedMaxPrix = normalizeNumber(maxPrix);
  let resolvedMin = parsedMinPrix;
  let resolvedMax = parsedMaxPrix;

  if (resolvedMin !== undefined && resolvedMax !== undefined && resolvedMax < resolvedMin) {
    [resolvedMin, resolvedMax] = [resolvedMax, resolvedMin];
  }

  if (resolvedMin !== undefined || resolvedMax !== undefined) {
    filter.prixBaseActuel = {};
    if (resolvedMin !== undefined) {
      filter.prixBaseActuel.$gte = resolvedMin;
    }
    if (resolvedMax !== undefined) {
      filter.prixBaseActuel.$lte = resolvedMax;
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ titre: regex }, { slug: regex }];
  }

  let sortSpec = { createdAt: -1 };
  switch (sort) {
    case 'name-asc':
      sortSpec = { titre: 1 };
      break;
    case 'name-desc':
      sortSpec = { titre: -1 };
      break;
    case 'price-asc':
      sortSpec = { prixBaseActuel: 1 };
      break;
    case 'price-desc':
      sortSpec = { prixBaseActuel: -1 };
      break;
    case 'created-asc':
      sortSpec = { createdAt: 1 };
      break;
    case 'created-desc':
      sortSpec = { createdAt: -1 };
      break;
    default:
      break;
  }

  if (auth.role === 'client') {
    const activeBoutiques = await Boutique.find({ isActive: true }).select('_id').lean();
    const activeBoutiqueIds = activeBoutiques.map((b) => b._id);
    filter.boutiqueId = { $in: activeBoutiqueIds };
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const itemsQuery = Produit.find(filter)
    .sort(sortSpec)
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit);

  if (auth.role === 'client') {
    itemsQuery
      .populate('boutiqueId', 'nom isActive manualSwitchOpen horaires fermeturesExceptionnelles')
      .populate('categorieId', 'nom');
  } else {
    itemsQuery.lean();
  }

  const [items, total] = await Promise.all([itemsQuery, Produit.countDocuments(filter)]);

  const sanitizedItems =
    auth.role === 'client'
      ? items.map((item) => sanitizeProduitForClient(item.toJSON({ virtuals: true })))
      : items;

  return {
    items: sanitizedItems,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const getLandingProduits = async ({ limit = 6 } = {}) => {
  const resolvedLimit = clampLandingLimit(limit, 6);
  const activeBoutiques = await Boutique.find({ isActive: true }).select('_id').lean();
  const activeBoutiqueIds = activeBoutiques.map((b) => b._id);

  const baseFilter = {
    estActif: true,
    publishedAt: { $exists: true, $ne: null },
    boutiqueId: { $in: activeBoutiqueIds },
  };

  let bestSeller = null;
  const selectedIds = new Set();

  const topRows = await Commande.aggregate([
    { $unwind: '$boutiques' },
    { $match: { 'boutiques.status': { $ne: 'annulee' } } },
    { $unwind: '$boutiques.items' },
    { $match: { 'boutiques.items.produitId': { $ne: null } } },
    {
      $group: {
        _id: '$boutiques.items.produitId',
        quantite: { $sum: '$boutiques.items.quantite' },
      },
    },
    { $sort: { quantite: -1 } },
    { $limit: 25 },
  ]);

  const topIds = topRows.map((row) => row._id).filter(Boolean);
  if (topIds.length) {
    const products = await Produit.find({ _id: { $in: topIds }, ...baseFilter }).lean();
    if (products.length) {
      const variationStockSet = await buildVariationStockSet(products);
      const byId = new Map(products.map((produit) => [produit._id.toString(), produit]));
      for (const id of topIds) {
        const key = id.toString();
        const candidate = byId.get(key);
        if (!candidate) continue;
        if (!isProduitInStock(candidate, variationStockSet)) continue;
        bestSeller = candidate;
        selectedIds.add(key);
        break;
      }
    }
  }

  const newestList = await pickInStockProducts({
    filter: baseFilter,
    sort: { publishedAt: -1, createdAt: -1 },
    limit: 1,
    excludeIds: Array.from(selectedIds),
  });

  const newest = newestList[0] || null;
  if (newest) {
    selectedIds.add(newest._id.toString());
  }

  const remaining = Math.max(0, resolvedLimit - selectedIds.size);
  const others = remaining
    ? await pickInStockProducts({
      filter: baseFilter,
      sort: { publishedAt: -1, createdAt: -1 },
      limit: remaining,
      excludeIds: Array.from(selectedIds),
    })
    : [];

  const result = {
    limit: resolvedLimit,
    bestSeller,
    newest,
    others,
    total: (bestSeller ? 1 : 0) + (newest ? 1 : 0) + others.length,
  };

  // Populate data for client/landing
  const [pBestSeller, pNewest, pOthers] = await Promise.all([
    populateForLanding(result.bestSeller),
    populateForLanding(result.newest),
    Promise.all(result.others.map((p) => populateForLanding(p))),
  ]);

  return {
    ...result,
    bestSeller: pBestSeller,
    newest: pNewest,
    others: pOthers.filter(Boolean),
  };
};

const populateForLanding = async (produit) => {
  if (!produit) return null;
  const doc = await Produit.findById(produit._id)
    .populate('boutiqueId', 'nom isActive manualSwitchOpen horaires fermeturesExceptionnelles')
    .populate('categorieId', 'nom');
  if (!doc) return null;
  return sanitizeProduitForClient(doc.toJSON({ virtuals: true }));
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

  const produit = await Produit.findById(productId).lean();
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

  let variationId = payload?.variationId ?? null;
  if (variationId) {
    if (!mongoose.Types.ObjectId.isValid(variationId)) {
      throw createError('variationId invalide', 400);
    }
    const variation = await VariationProduit.findOne({
      _id: variationId,
      produitId: produit._id,
    })
      .select('_id')
      .lean();
    if (!variation) {
      throw createError('Variation introuvable', 404);
    }
    variationId = variation._id;
  }

  const filter = {
    boutiqueId: produit.boutiqueId,
    produitId: produit._id,
    variationId: variationId ?? null,
  };

  const alerte = await AlerteStock.findOneAndUpdate(
    filter,
    {
      $set: {
        seuil: seuilAlerte,
        estActif: true,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return alerte.toObject();
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

  const produits = await Produit.find(filter).select('_id boutiqueId').lean();
  if (!produits.length) {
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
  }

  const ops = produits.map((produit) => ({
    updateOne: {
      filter: {
        boutiqueId: produit.boutiqueId,
        produitId: produit._id,
        variationId: null,
      },
      update: {
        $set: {
          seuil: seuilAlerte,
          estActif: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await AlerteStock.bulkWrite(ops, { ordered: false });

  return {
    matchedCount: result.matchedCount ?? result.nMatched ?? 0,
    modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
    upsertedCount: result.upsertedCount ?? result.nUpserted ?? 0,
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

  const stockBefore =
    produit.stock && typeof produit.stock === 'object' ? produit.stock.quantite : undefined;

  if (payload.stock !== undefined) {
    const stockInput = normalizeObject(payload.stock);
    if (!stockInput) {
      throw createError('stock invalide', 400);
    }
    const currentStock = produit.stock && typeof produit.stock === 'object' ? produit.stock : {};
    const merged = { ...currentStock, ...stockInput };
    delete merged.seuilAlerte;
    produit.stock = merged;
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

  if (payload.stock !== undefined) {
    const stockAfter =
      produit.stock && typeof produit.stock === 'object' ? produit.stock.quantite : undefined;
    if (stockAfter !== stockBefore) {
      try {
        await triggerStockAlertIfNeeded({
          produitId: produit._id,
          boutiqueId: produit.boutiqueId,
          stockBefore,
          stockAfter,
          produitTitre: produit.titre,
        });
      } catch (error) {
        console.error('Stock alert trigger failed:', error);
      }
    }
  }

  return produit.toObject();
};
