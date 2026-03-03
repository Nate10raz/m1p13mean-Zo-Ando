import mongoose from 'mongoose';
import AlerteStock from '../models/AlerteStock.js';
import MouvementStock from '../models/MouvementStock.js';
import Avis from '../models/Avis.js';
import Category from '../models/Category.js';
import Commande from '../models/Commande.js';
import Boutique from '../models/Boutique.js';
import FraisLivraison from '../models/FraisLivraison.js';
import FermetureBoutique from '../models/FermetureBoutique.js';
import Panier from '../models/Panier.js';
import PayementBox from '../models/PayementBox.js';
import Produit from '../models/Produit.js';
import User from '../models/User.js';
import { triggerStockAlertIfNeeded } from './produit.service.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

export const getLatestFraisLivraison = async (boutiqueId = null) => {
  return await FraisLivraison.findOne({ boutiqueId, estActif: true }).sort({ createdAt: -1 });
};

const clampTopN = (value, fallback = 5) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(50, parsed));
};

const roundNumber = (value, digits = 0) => {
  const num = Number(value || 0);
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
};

const formatMGA = (value) => {
  const rounded = roundNumber(value, 0);
  return `Ar ${rounded.toLocaleString('fr-FR')}`;
};

const formatPercent = (value) => `${roundNumber(Number(value || 0) * 100, 2)}%`;

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = (page, limit, maxLimit = 200) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
  return { parsedPage, parsedLimit };
};

const parseBool = (value) => {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
};

const getStockQty = (doc) => {
  const qty = doc?.stock?.quantite;
  return typeof qty === 'number' && !Number.isNaN(qty) ? qty : 0;
};

const parseDateParam = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createError(`${label} invalide`, 400);
  }
  return date;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const resolveDateRange = (startInput, endInput) => {
  const now = new Date();
  let start = parseDateParam(startInput, 'startDate');
  let end = parseDateParam(endInput, 'endDate');

  if (!start && !end) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = now;
  } else if (start && !end) {
    end = now;
  } else if (!start && end) {
    start = new Date(end);
    start.setDate(start.getDate() - 30);
  }

  start = startOfDay(start);
  end = endOfDay(end);

  if (start > end) {
    throw createError('startDate doit etre inferieur ou egal a endDate', 400);
  }

  return { start, end };
};

const resolveMovementRange = (startInput, endInput) => {
  let start = parseDateParam(startInput, 'startDate');
  let end = parseDateParam(endInput, 'endDate');

  if (start) start = startOfDay(start);
  if (end) end = endOfDay(end);

  if (start && end && start > end) {
    throw createError('startDate doit etre inferieur ou egal a endDate', 400);
  }

  return { start, end };
};

const getGranularityFormat = (granularity) => {
  if (granularity === 'month') return '%Y-%m';
  if (granularity === 'week') return '%Y-%U';
  return '%Y-%m-%d';
};

const safeId = (value) => (value ? value.toString() : null);

const requireBoutiqueUser = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createError('Utilisateur introuvable', 404);
  }
  const user = await User.findById(userId).lean();
  if (!user) {
    throw createError('Utilisateur introuvable', 404);
  }
  if (user.role !== 'boutique') {
    throw createError('Only boutique accounts can access this endpoint', 403);
  }
  if (!user.boutiqueId) {
    throw createError('Aucune boutique associee a cet utilisateur', 404);
  }
  return user;
};

export const getMyBoutique = async (userId) => {
  const user = await requireBoutiqueUser(userId);
  const boutiqueDoc = await Boutique.findById(user.boutiqueId).populate('boxIds');
  if (!boutiqueDoc) {
    throw createError('Boutique introuvable', 404);
  }
  const boutique = boutiqueDoc.toObject();
  const [latestFee, closures] = await Promise.all([
    getLatestFraisLivraison(boutique._id),
    FermetureBoutique.find({ boutiqueId: boutique._id, isActive: true }),
  ]);
  boutique.fraisLivraison = latestFee ? latestFee.montant : 0;
  boutique.fraisLivraisonData = latestFee
    ? { montant: latestFee.montant, type: latestFee.type || 'fixe' }
    : null;
  boutique.fermeureBoutique = closures;
  return boutique;
};

export const updateMyBoutique = async (userId, data) => {
  const user = await requireBoutiqueUser(userId);
  return updateBoutique(user.boutiqueId, userId, data);
};

export const getBoutiqueById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createError('ID de boutique invalide', 400);
  }
  const boutiqueDoc = await Boutique.findById(id).populate('boxIds');
  if (!boutiqueDoc) {
    throw createError('Boutique introuvable', 404);
  }
  const boutique = boutiqueDoc.toObject();
  const [latestFee, closures] = await Promise.all([
    getLatestFraisLivraison(boutique._id),
    FermetureBoutique.find({ boutiqueId: boutique._id, isActive: true }),
  ]);
  boutique.fraisLivraison = latestFee ? latestFee.montant : 0;
  boutique.fraisLivraisonData = latestFee
    ? { montant: latestFee.montant, type: latestFee.type || 'fixe' }
    : null;
  boutique.fermeureBoutique = closures;
  return boutique;
};

export const updateBoutique = async (id, userId, data) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createError('ID de boutique invalide', 400);
  }
  const boutique = await Boutique.findById(id);
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }

  // Ownership check: userId must match boutique.userId
  if (boutique.userId.toString() !== userId) {
    throw createError("Accès refusé : vous n'êtes pas le propriétaire de cette boutique", 403);
  }

  // Define allowed fields to update
  const allowedUpdates = [
    'nom',
    'description',
    'logo',
    'banner',
    'adresse',
    'horaires',
    'telephone',
    'email',
    'clickCollectActif',
    'plage_livraison_boutique',
    'accepteLivraisonJourJ',
    'boxIds',
    'livraisonStatus',
    'manualSwitchOpen',
  ];

  // Handle FraisLivraison separately
  if (data.fraisLivraison !== undefined) {
    await FraisLivraison.create({
      boutiqueId: boutique._id,
      montant: parseFloat(data.fraisLivraison),
      type: data.fraisLivraisonType || 'fixe',
      creePar: userId,
      estActif: true,
    });
  }

  // Handle FermetureBoutique if provided
  if (data.fermeureBoutique !== undefined) {
    // Delete old ones or set isActive: false? Usually delete or replace for simplicity in this type of patch.
    await FermetureBoutique.deleteMany({ boutiqueId: boutique._id });
    if (Array.isArray(data.fermeureBoutique) && data.fermeureBoutique.length > 0) {
      const docs = data.fermeureBoutique.map((c) => ({
        boutiqueId: boutique._id,
        debut: c.debut,
        fin: c.fin,
        motif: c.motif,
        isActive: true,
      }));
      await FermetureBoutique.insertMany(docs);
    }
  }

  Object.keys(data).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      boutique[key] = data[key];
    }
  });

  await boutique.save();
  return boutique;
};

export const getBoutiqueSalesDashboard = async (
  { startDate, endDate, topN, granularity } = {},
  auth = { userId: null, role: null },
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;
  const { start, end } = resolveDateRange(startDate, endDate);
  const limit = clampTopN(topN, 5);
  const dateFormat = getGranularityFormat(granularity);
  const produitCollection = Produit.collection.name;
  const categoryCollection = Category.collection.name;
  const mouvementCollection = MouvementStock.collection.name;
  const alerteCollection = AlerteStock.collection.name;

  const orderBaseMatch = {
    createdAt: { $gte: start, $lte: end },
    'boutiques.boutiqueId': boutiqueId,
  };

  const [
    ordersStatusAgg,
    revenueAgg,
    revenueTrendAgg,
    topProductsAgg,
    topCategoriesAgg,
    clientsAgg,
    avisAgg,
    stockAlertCount,
    lowStockCountAgg,
    panierAgg,
    payementStatusAgg,
    arrearsAgg,
    nextDue,
  ] = await Promise.all([
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId } },
      {
        $group: {
          _id: '$boutiques.status',
          count: { $sum: 1 },
        },
      },
    ]),
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId, 'boutiques.status': { $ne: 'annulee' } } },
      { $unwind: '$boutiques.items' },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: { $multiply: ['$boutiques.items.quantite', '$boutiques.items.prixUnitaire'] },
          },
          itemsCount: { $sum: '$boutiques.items.quantite' },
        },
      },
    ]),
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId, 'boutiques.status': { $ne: 'annulee' } } },
      { $unwind: '$boutiques.items' },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$createdAt' },
          },
          revenue: {
            $sum: { $multiply: ['$boutiques.items.quantite', '$boutiques.items.prixUnitaire'] },
          },
          orders: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          ordersCount: { $size: '$orders' },
        },
      },
      { $sort: { date: 1 } },
    ]),
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId, 'boutiques.status': { $ne: 'annulee' } } },
      { $unwind: '$boutiques.items' },
      {
        $group: {
          _id: {
            produitId: '$boutiques.items.produitId',
            nomProduit: '$boutiques.items.nomProduit',
          },
          quantite: { $sum: '$boutiques.items.quantite' },
          revenue: {
            $sum: { $multiply: ['$boutiques.items.quantite', '$boutiques.items.prixUnitaire'] },
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]),
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId, 'boutiques.status': { $ne: 'annulee' } } },
      { $unwind: '$boutiques.items' },
      {
        $lookup: {
          from: produitCollection,
          localField: 'boutiques.items.produitId',
          foreignField: '_id',
          as: 'produit',
        },
      },
      { $unwind: { path: '$produit', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: categoryCollection,
          localField: 'produit.categorieId',
          foreignField: '_id',
          as: 'categorie',
        },
      },
      { $unwind: { path: '$categorie', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categorie._id',
          categorieNom: { $first: '$categorie.nom' },
          quantite: { $sum: '$boutiques.items.quantite' },
          revenue: {
            $sum: { $multiply: ['$boutiques.items.quantite', '$boutiques.items.prixUnitaire'] },
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]),
    Commande.aggregate([
      { $match: orderBaseMatch },
      { $unwind: '$boutiques' },
      { $match: { 'boutiques.boutiqueId': boutiqueId } },
      { $group: { _id: '$clientId' } },
      { $count: 'count' },
    ]),
    Avis.aggregate([
      { $match: { boutiqueId: boutiqueId } },
      { $group: { _id: null, avgNote: { $avg: '$note' }, count: { $sum: 1 } } },
    ]),
    AlerteStock.countDocuments({ boutiqueId, estActif: true }),
    Produit.aggregate([
      { $match: { boutiqueId } },
      {
        $lookup: {
          from: mouvementCollection,
          let: { pid: '$_id', bid: '$boutiqueId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$produitId', '$$pid'] },
                    { $eq: ['$boutiqueId', '$$bid'] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { stockApres: 1 } },
          ],
          as: 'lastMove',
        },
      },
      {
        $lookup: {
          from: alerteCollection,
          let: { pid: '$_id', bid: '$boutiqueId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$produitId', '$$pid'] },
                    { $eq: ['$boutiqueId', '$$bid'] },
                  ],
                },
              },
            },
            { $match: { estActif: true, variationId: null } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { seuil: 1 } },
          ],
          as: 'alerte',
        },
      },
      {
        $addFields: {
          stockTheorique: {
            $ifNull: [
              { $arrayElemAt: ['$lastMove.stockApres', 0] },
              { $ifNull: ['$stock.quantite', 0] },
            ],
          },
          seuilAlerte: {
            $ifNull: [{ $arrayElemAt: ['$alerte.seuil', 0] }, '$stock.seuilAlerte'],
          },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $ne: ['$seuilAlerte', null] },
              { $lte: ['$stockTheorique', '$seuilAlerte'] },
            ],
          },
        },
      },
      { $count: 'count' },
    ]),
    Panier.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, 'items.boutiqueId': boutiqueId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    PayementBox.aggregate([
      { $match: { boutiqueId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$montant' },
        },
      },
    ]),
    PayementBox.aggregate([
      {
        $match: {
          boutiqueId,
          status: 'en_attente',
          dueDate: { $exists: true, $ne: null, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$montant' },
          count: { $sum: 1 },
        },
      },
    ]),
    PayementBox.findOne({
      boutiqueId,
      status: 'en_attente',
      dueDate: { $exists: true, $ne: null, $gt: new Date() },
    })
      .sort({ dueDate: 1 })
      .select('dueDate montant reference')
      .lean(),
  ]);

  const statusMap = {
    en_preparation: 0,
    peut_etre_collecte: 0,
    annulee: 0,
    en_attente_validation: 0,
    non_acceptee: 0,
  };
  ordersStatusAgg.forEach((row) => {
    if (row && row._id && Object.prototype.hasOwnProperty.call(statusMap, row._id)) {
      statusMap[row._id] = row.count || 0;
    }
  });
  const totalOrders = Object.values(statusMap).reduce((sum, value) => sum + value, 0);
  const cancelledOrders = statusMap.annulee || 0;
  const effectiveOrders = Math.max(0, totalOrders - cancelledOrders);

  const revenueInfo = revenueAgg[0] || { revenue: 0, itemsCount: 0 };
  const aov = effectiveOrders > 0 ? revenueInfo.revenue / effectiveOrders : 0;
  const cancelRate = totalOrders > 0 ? cancelledOrders / totalOrders : 0;

  const clientsInfo = clientsAgg[0] || { count: 0 };
  const avisInfo = avisAgg[0] || { avgNote: 0, count: 0 };
  const lowStockInfo = lowStockCountAgg[0] || { count: 0 };

  const payementCounts = { valide: 0, en_attente: 0, rejete: 0 };
  const payementAmounts = { valide: 0, en_attente: 0, rejete: 0 };
  payementStatusAgg.forEach((row) => {
    if (!row || !row._id) return;
    if (!Object.prototype.hasOwnProperty.call(payementCounts, row._id)) return;
    payementCounts[row._id] = row.count || 0;
    payementAmounts[row._id] = row.amount || 0;
  });
  const arrearsInfo = arrearsAgg[0] || { amount: 0, count: 0 };

  const panierCounts = { active: 0, abandoned: 0, converted: 0 };
  panierAgg.forEach((row) => {
    if (!row || !row._id) return;
    if (!Object.prototype.hasOwnProperty.call(panierCounts, row._id)) return;
    panierCounts[row._id] = row.count || 0;
  });
  const totalPaniers = Object.values(panierCounts).reduce((sum, value) => sum + value, 0);
  const conversionRate = totalPaniers > 0 ? panierCounts.converted / totalPaniers : 0;

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    currency: 'MGA',
    topN: limit,
    boutique: {
      id: safeId(boutiqueId),
    },
    sales: {
      revenue: revenueInfo.revenue || 0,
      ordersCount: totalOrders,
      ordersValidCount: effectiveOrders,
      aov,
      cancelRate,
      statusCounts: statusMap,
      trend: revenueTrendAgg.map((row) => ({
        date: row.date,
        revenue: row.revenue || 0,
        revenueFormatted: formatMGA(row.revenue || 0),
        ordersCount: row.ordersCount || 0,
      })),
      topProducts: topProductsAgg.map((row) => ({
        produitId: safeId(row._id?.produitId),
        nomProduit: row._id?.nomProduit || null,
        quantite: row.quantite || 0,
        revenue: row.revenue || 0,
        revenueFormatted: formatMGA(row.revenue || 0),
      })),
      topCategories: topCategoriesAgg.map((row) => ({
        categorieId: safeId(row._id),
        categorieNom: row.categorieNom || null,
        quantite: row.quantite || 0,
        revenue: row.revenue || 0,
        revenueFormatted: formatMGA(row.revenue || 0),
      })),
    },
    customers: {
      activeCount: clientsInfo.count || 0,
      avisCount: avisInfo.count || 0,
      noteMoyenne: avisInfo.avgNote || 0,
    },
    stock: {
      lowStockCount: lowStockInfo.count || 0,
      alertsCount: stockAlertCount || 0,
    },
    carts: {
      total: totalPaniers,
      byStatus: panierCounts,
      conversionRate,
    },
    rent: {
      payments: {
        counts: payementCounts,
        amounts: payementAmounts,
      },
      arrears: {
        asOf: end.toISOString(),
        amount: arrearsInfo.amount || 0,
        count: arrearsInfo.count || 0,
      },
      nextDue: nextDue
        ? {
            dueDate: nextDue.dueDate,
            amount: nextDue.montant || 0,
            reference: nextDue.reference || null,
          }
        : null,
    },
    display: {
      currency: 'MGA',
      revenue: formatMGA(revenueInfo.revenue || 0),
      aov: formatMGA(aov),
      cancelRate: formatPercent(cancelRate),
      conversionRate: formatPercent(conversionRate),
      arrearsAmount: formatMGA(arrearsInfo.amount || 0),
      rentPaid: formatMGA(payementAmounts.valide || 0),
      rentPending: formatMGA(payementAmounts.en_attente || 0),
      noteMoyenne: roundNumber(avisInfo.avgNote || 0, 2),
    },
  };
};

export const getBoutiqueInventory = async (
  { page = 1, limit = 20, search, lowStock, categorieId, estActif } = {},
  auth = { userId: null, role: null },
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;
  const { parsedPage, parsedLimit } = parsePagination(page, limit);
  const lowStockOnly = parseBool(lowStock) === true;

  const match = { boutiqueId };
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ titre: regex }, { slug: regex }, { sku: regex }];
  }

  if (categorieId) {
    if (!mongoose.Types.ObjectId.isValid(categorieId)) {
      throw createError('categorieId invalide', 400);
    }
    match.categorieId = new mongoose.Types.ObjectId(categorieId);
  }

  const parsedEstActif = parseBool(estActif);
  if (parsedEstActif !== undefined) {
    match.estActif = parsedEstActif;
  }

  const mouvementCollection = MouvementStock.collection.name;
  const alerteCollection = AlerteStock.collection.name;

  const basePipeline = [
    { $match: match },
    {
      $lookup: {
        from: mouvementCollection,
        let: { pid: '$_id', bid: '$boutiqueId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$produitId', '$$pid'] },
                  { $eq: ['$boutiqueId', '$$bid'] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { stockApres: 1, createdAt: 1 } },
        ],
        as: 'lastMove',
      },
    },
    {
      $lookup: {
        from: alerteCollection,
        let: { pid: '$_id', bid: '$boutiqueId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$produitId', '$$pid'] },
                  { $eq: ['$boutiqueId', '$$bid'] },
                ],
              },
            },
          },
          { $match: { estActif: true, variationId: null } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { seuil: 1 } },
        ],
        as: 'alerte',
      },
    },
    {
      $addFields: {
        stockTheorique: {
          $ifNull: [
            { $arrayElemAt: ['$lastMove.stockApres', 0] },
            { $ifNull: ['$stock.quantite', 0] },
          ],
        },
        lastMovementAt: { $arrayElemAt: ['$lastMove.createdAt', 0] },
        seuilAlerte: {
          $ifNull: [{ $arrayElemAt: ['$alerte.seuil', 0] }, '$stock.seuilAlerte'],
        },
      },
    },
    {
      $addFields: {
        isLowStock: {
          $cond: [
            {
              $and: [
                { $ne: ['$seuilAlerte', null] },
                { $lte: ['$stockTheorique', '$seuilAlerte'] },
              ],
            },
            true,
            false,
          ],
        },
      },
    },
  ];

  if (lowStockOnly) {
    basePipeline.push({ $match: { isLowStock: true } });
  }

  const itemsPipeline = [
    ...basePipeline,
    {
      $project: {
        _id: 1,
        titre: 1,
        sku: 1,
        slug: 1,
        images: 1,
        prixBaseActuel: 1,
        estActif: 1,
        stockTheorique: 1,
        seuilAlerte: 1,
        isLowStock: 1,
        lastMovementAt: 1,
      },
    },
    { $sort: { titre: 1 } },
    { $skip: (parsedPage - 1) * parsedLimit },
    { $limit: parsedLimit },
  ];

  const countPipeline = [...basePipeline, { $count: 'count' }];

  const [items, totalAgg] = await Promise.all([
    Produit.aggregate(itemsPipeline),
    Produit.aggregate(countPipeline),
  ]);

  const total = totalAgg[0]?.count || 0;

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

const movementTypes = ['ajout', 'retrait', 'commande', 'ajustement', 'retour', 'defectueux'];

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildStockMovementsCsv = (rows = [], produit = null) => {
  const header = [
    'ProduitId',
    'Produit',
    'SKU',
    'Date',
    'Type',
    'Quantite',
    'StockAvant',
    'StockApres',
    'Reference',
    'Raison',
    'CommandeId',
    'UserId',
    'VariationId',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row?.produitId?.toString?.() || row?.produitId || '',
        produit?.titre || '',
        produit?.sku || '',
        row?.createdAt ? new Date(row.createdAt).toISOString() : '',
        row?.type || '',
        row?.quantite ?? '',
        row?.stockAvant ?? '',
        row?.stockApres ?? '',
        row?.reference || '',
        row?.raison || '',
        row?.commandeId?.toString?.() || row?.commandeId || '',
        row?.userId?.toString?.() || row?.userId || '',
        row?.variationId?.toString?.() || row?.variationId || '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  return `\ufeff${lines.join('\r\n')}`;
};

const buildStockMovementsGlobalCsv = (rows = []) => {
  const header = [
    'ProduitId',
    'Produit',
    'SKU',
    'CategorieId',
    'Date',
    'Type',
    'Quantite',
    'StockAvant',
    'StockApres',
    'Reference',
    'Raison',
    'CommandeId',
    'UserId',
    'VariationId',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row?.produitId?.toString?.() || row?.produitId || '',
        row?.produitTitre || '',
        row?.produitSku || '',
        row?.categorieId?.toString?.() || row?.categorieId || '',
        row?.createdAt ? new Date(row.createdAt).toISOString() : '',
        row?.type || '',
        row?.quantite ?? '',
        row?.stockAvant ?? '',
        row?.stockApres ?? '',
        row?.reference || '',
        row?.raison || '',
        row?.commandeId?.toString?.() || row?.commandeId || '',
        row?.userId?.toString?.() || row?.userId || '',
        row?.variationId?.toString?.() || row?.variationId || '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  return `\ufeff${lines.join('\r\n')}`;
};

export const getBoutiqueStockMovements = async (
  { produitId, page = 1, limit = 50, type, startDate, endDate } = {},
  auth = { userId: null, role: null },
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  if (!produitId || !mongoose.Types.ObjectId.isValid(produitId)) {
    throw createError('produitId invalide', 400);
  }

  const produit = await Produit.findOne({ _id: produitId, boutiqueId })
    .select('_id titre sku')
    .lean();
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const match = { boutiqueId, produitId: produit._id };
  if (type) {
    if (!movementTypes.includes(type)) {
      throw createError('type invalide', 400);
    }
    match.type = type;
  }

  const { start, end } = resolveMovementRange(startDate, endDate);
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const [items, total] = await Promise.all([
    MouvementStock.find(match)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    MouvementStock.countDocuments(match),
  ]);

  return {
    produit,
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const exportBoutiqueStockMovementsCsv = async (
  { produitId, type, startDate, endDate, limit } = {},
  auth = { userId: null, role: null },
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  if (!produitId || !mongoose.Types.ObjectId.isValid(produitId)) {
    throw createError('produitId invalide', 400);
  }

  const produit = await Produit.findOne({ _id: produitId, boutiqueId })
    .select('_id titre sku')
    .lean();
  if (!produit) {
    throw createError('Produit introuvable', 404);
  }

  const match = { boutiqueId, produitId: produit._id };
  if (type) {
    if (!movementTypes.includes(type)) {
      throw createError('type invalide', 400);
    }
    match.type = type;
  }

  const { start, end } = resolveMovementRange(startDate, endDate);
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const maxExport = 5000;
  const parsedLimit = Math.min(
    maxExport,
    Math.max(1, parseInt(limit, 10) || maxExport),
  );

  const rows = await MouvementStock.find(match)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .lean();

  const csv = buildStockMovementsCsv(rows, produit);
  const safeName = String(produit.titre || 'produit')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    csv,
    filename: `mouvements-${safeName || produit._id.toString()}.csv`,
    count: rows.length,
  };
};

export const exportBoutiqueStockMovementsGlobalCsv = async (
  { type, startDate, endDate, limit, search, categorieId, estActif } = {},
  auth = { userId: null, role: null },
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  const match = { boutiqueId };
  if (type) {
    if (!movementTypes.includes(type)) {
      throw createError('type invalide', 400);
    }
    match.type = type;
  }

  const { start, end } = resolveMovementRange(startDate, endDate);
  if (start || end) {
    match.createdAt = {};
    if (start) match.createdAt.$gte = start;
    if (end) match.createdAt.$lte = end;
  }

  const productMatch = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    productMatch.$or = [
      { 'produit.titre': regex },
      { 'produit.slug': regex },
      { 'produit.sku': regex },
    ];
  }

  if (categorieId) {
    if (!mongoose.Types.ObjectId.isValid(categorieId)) {
      throw createError('categorieId invalide', 400);
    }
    productMatch['produit.categorieId'] = new mongoose.Types.ObjectId(categorieId);
  }

  const parsedEstActif = parseBool(estActif);
  if (parsedEstActif !== undefined) {
    productMatch['produit.estActif'] = parsedEstActif;
  }

  const maxExport = 10000;
  const parsedLimit = Math.min(
    maxExport,
    Math.max(1, parseInt(limit, 10) || maxExport),
  );

  const produitCollection = Produit.collection.name;
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: produitCollection,
        localField: 'produitId',
        foreignField: '_id',
        as: 'produit',
      },
    },
    { $unwind: { path: '$produit', preserveNullAndEmptyArrays: true } },
  ];

  if (Object.keys(productMatch).length) {
    pipeline.push({ $match: productMatch });
  }

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $limit: parsedLimit },
    {
      $project: {
        produitId: 1,
        produitTitre: '$produit.titre',
        produitSku: '$produit.sku',
        categorieId: '$produit.categorieId',
        createdAt: 1,
        type: 1,
        quantite: 1,
        stockAvant: 1,
        stockApres: 1,
        reference: 1,
        raison: 1,
        commandeId: 1,
        userId: 1,
        variationId: 1,
      },
    },
  );

  const rows = await MouvementStock.aggregate(pipeline);
  const csv = buildStockMovementsGlobalCsv(rows);
  const today = new Date().toISOString().slice(0, 10);

  return {
    csv,
    filename: `mouvements-boutique-${today}.csv`,
    count: rows.length,
  };
};

export const createBoutiqueStockMovementsBulk = async (payload, auth = { userId: null, role: null }) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) {
    throw createError('items requis', 400);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (const item of items) {
    const result = {
      produitId: item?.produitId,
      stockAvant: null,
      stockApres: null,
      mouvementId: null,
      status: 'failed',
      error: null,
    };

    if (!item?.produitId || !mongoose.Types.ObjectId.isValid(item.produitId)) {
      failed += 1;
      result.error = 'produitId invalide';
      results.push(result);
      continue;
    }

    const stockPhysique = normalizeNumber(item.stockPhysique);
    if (stockPhysique === undefined || stockPhysique < 0) {
      failed += 1;
      result.error = 'stockPhysique invalide';
      results.push(result);
      continue;
    }

    const reference =
      typeof item.reference === 'string' && item.reference.trim() ? item.reference.trim() : undefined;
    const raison =
      typeof item.raison === 'string' && item.raison.trim() ? item.raison.trim() : undefined;

    const produitId = new mongoose.Types.ObjectId(item.produitId);
    const now = new Date();

    const beforeDoc = await Produit.findOneAndUpdate(
      { _id: produitId, boutiqueId },
      { $set: { 'stock.quantite': stockPhysique, updatedAt: now } },
      { new: false, projection: { stock: 1, titre: 1 } },
    );

    if (!beforeDoc) {
      failed += 1;
      result.error = 'Produit introuvable';
      results.push(result);
      continue;
    }

    const stockBefore = getStockQty(beforeDoc);
    const stockAfter = stockPhysique;
    const effectiveDelta = stockAfter - stockBefore;

    result.stockAvant = stockBefore;
    result.stockApres = stockAfter;

    if (!effectiveDelta) {
      skipped += 1;
      result.status = 'skipped';
      results.push(result);
      continue;
    }

    const mouvement = await MouvementStock.create({
      produitId,
      boutiqueId,
      type: 'ajustement',
      quantite: Math.abs(effectiveDelta),
      stockAvant: stockBefore,
      stockApres: stockAfter,
      reference,
      userId: auth.userId,
      raison: raison || 'Inventaire rapide',
      createdAt: now,
    });

    result.mouvementId = mouvement?._id || null;
    result.status = 'updated';
    updated += 1;

    try {
      await triggerStockAlertIfNeeded({
        produitId,
        boutiqueId,
        stockBefore,
        stockAfter,
        produitTitre: beforeDoc?.titre,
      });
    } catch (error) {
      console.error('Stock alert trigger failed:', error);
    }

    results.push(result);
  }

  return {
    processed: items.length,
    updated,
    skipped,
    failed,
    results,
  };
};

export const importBoutiqueStockCsv = async (payload, auth = { userId: null, role: null }) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) {
    throw createError('items requis', 400);
  }

  const errors = [];
  const resolved = [];
  const seen = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const rowNumber = index + 1;
    const produitIdRaw = item.produitId;
    const produitName =
      typeof item.produit === 'string' && item.produit.trim() ? item.produit.trim() : null;
    const skuRaw = typeof item.sku === 'string' && item.sku.trim() ? item.sku.trim() : null;
    const stockPhysique = normalizeNumber(item.stockPhysique);
    const reference =
      typeof item.reference === 'string' && item.reference.trim() ? item.reference.trim() : undefined;
    const raison =
      typeof item.raison === 'string' && item.raison.trim() ? item.raison.trim() : undefined;

    if (stockPhysique === undefined || stockPhysique === null || stockPhysique < 0) {
      errors.push({ row: rowNumber, field: 'stockPhysique', message: 'stockPhysique invalide' });
      continue;
    }

    if (!Number.isInteger(stockPhysique)) {
      errors.push({
        row: rowNumber,
        field: 'stockPhysique',
        message: 'stockPhysique doit etre un entier',
      });
      continue;
    }

    const hasProduitId = Boolean(produitIdRaw);
    const hasProduitName = Boolean(produitName);
    const hasSku = Boolean(skuRaw);

    if (!hasProduitId && !hasProduitName && !hasSku) {
      errors.push({
        row: rowNumber,
        field: 'produit/sku',
        message: 'produit ou sku requis',
      });
      continue;
    }

    let produitById = null;
    if (hasProduitId) {
      if (!mongoose.Types.ObjectId.isValid(produitIdRaw)) {
        errors.push({ row: rowNumber, field: 'produitId', message: 'produitId invalide' });
        continue;
      }
      produitById = await Produit.findOne({ _id: produitIdRaw, boutiqueId })
        .select('_id titre sku')
        .lean();
      if (!produitById) {
        errors.push({ row: rowNumber, field: 'produitId', message: 'Produit introuvable' });
        continue;
      }
    }

    let produitBySku = null;
    if (hasSku) {
      produitBySku = await Produit.findOne({ sku: skuRaw, boutiqueId })
        .select('_id titre sku')
        .lean();
      if (!produitBySku) {
        errors.push({ row: rowNumber, field: 'sku', message: 'SKU introuvable' });
        continue;
      }
    }

    let produitByName = null;
    if (hasProduitName) {
      const escaped = escapeRegex(produitName);
      const candidates = await Produit.find({
        boutiqueId,
        titre: { $regex: `^${escaped}$`, $options: 'i' },
      })
        .select('_id titre sku')
        .lean();
      if (!candidates.length) {
        errors.push({ row: rowNumber, field: 'produit', message: 'Produit introuvable' });
        continue;
      }
      if (candidates.length > 1) {
        errors.push({
          row: rowNumber,
          field: 'produit',
          message: 'Nom produit non unique',
        });
        continue;
      }
      produitByName = candidates[0];
    }

    let produit = produitById || produitBySku || produitByName;
    if (produitById && produitBySku && produitById._id.toString() !== produitBySku._id.toString()) {
      errors.push({
        row: rowNumber,
        field: 'produitId/sku',
        message: 'produitId et sku ne correspondent pas',
      });
      continue;
    }

    if (produitById && produitByName && produitById._id.toString() !== produitByName._id.toString()) {
      errors.push({
        row: rowNumber,
        field: 'produitId/produit',
        message: 'produitId et nom produit ne correspondent pas',
      });
      continue;
    }

    if (produitBySku && produitByName && produitBySku._id.toString() !== produitByName._id.toString()) {
      errors.push({
        row: rowNumber,
        field: 'sku/produit',
        message: 'sku et nom produit ne correspondent pas',
      });
      continue;
    }

    if (!produit) {
      errors.push({ row: rowNumber, field: 'produit/sku', message: 'Produit introuvable' });
      continue;
    }

    const key = produit._id.toString();
    if (seen.has(key)) {
      errors.push({
        row: rowNumber,
        field: 'produitId/sku',
        message: 'Produit duplique dans le fichier',
      });
      continue;
    }
    seen.add(key);

    resolved.push({
      produit,
      stockPhysique,
      reference,
      raison,
    });
  }

  if (errors.length) {
    throw createError('Import CSV invalide', 400, { errors });
  }

  const applied = [];
  const results = [];

  try {
    for (const item of resolved) {
      const now = new Date();
      const beforeDoc = await Produit.findOneAndUpdate(
        { _id: item.produit._id, boutiqueId },
        { $set: { 'stock.quantite': item.stockPhysique, updatedAt: now } },
        { new: false, projection: { stock: 1, titre: 1 } },
      );

      if (!beforeDoc) {
        throw createError('Mise a jour stock impossible', 400);
      }

      const stockBefore = getStockQty(beforeDoc);
      const stockAfter = item.stockPhysique;
      const effectiveDelta = stockAfter - stockBefore;

      let mouvementId = null;
      if (effectiveDelta) {
        const mouvement = await MouvementStock.create({
          produitId: item.produit._id,
          boutiqueId,
          type: 'ajustement',
          quantite: Math.abs(effectiveDelta),
          stockAvant: stockBefore,
          stockApres: stockAfter,
          reference: item.reference,
          userId: auth.userId,
          raison: item.raison || 'Import CSV',
          createdAt: now,
        });
        mouvementId = mouvement?._id || null;
      }

      applied.push({
        produitId: item.produit._id,
        boutiqueId,
        stockBefore,
        mouvementId,
      });

      results.push({
        produitId: item.produit._id,
        stockAvant: stockBefore,
        stockApres: stockAfter,
        mouvementId,
      });

      if (effectiveDelta) {
        try {
          await triggerStockAlertIfNeeded({
            produitId: item.produit._id,
            boutiqueId,
            stockBefore,
            stockAfter,
            produitTitre: beforeDoc?.titre,
          });
        } catch (error) {
          console.error('Stock alert trigger failed:', error);
        }
      }
    }
  } catch (error) {
    for (const item of applied.reverse()) {
      try {
        await Produit.updateOne(
          { _id: item.produitId, boutiqueId: item.boutiqueId },
          { $set: { 'stock.quantite': item.stockBefore } },
        );
      } catch (rollbackError) {
        console.error('Stock rollback failed:', rollbackError);
      }
      if (item.mouvementId) {
        try {
          await MouvementStock.deleteOne({ _id: item.mouvementId });
        } catch (rollbackError) {
          console.error('Movement rollback failed:', rollbackError);
        }
      }
    }
    throw error;
  }

  return {
    processed: resolved.length,
    updated: results.length,
    results,
  };
};

export const createBoutiqueStockMovement = async (payload, auth = { userId: null, role: null }) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await requireBoutiqueUser(auth.userId);
  const boutiqueId = user.boutiqueId;

  if (!payload?.produitId || !mongoose.Types.ObjectId.isValid(payload.produitId)) {
    throw createError('produitId invalide', 400);
  }

  const type = payload?.type;
  if (!['ajout', 'retrait', 'ajustement'].includes(type)) {
    throw createError('type invalide', 400);
  }

  const quantite = normalizeNumber(payload?.quantite);
  const stockPhysique = normalizeNumber(payload?.stockPhysique);
  const reference =
    typeof payload?.reference === 'string' && payload.reference.trim()
      ? payload.reference.trim()
      : undefined;
  const raison =
    typeof payload?.raison === 'string' && payload.raison.trim() ? payload.raison.trim() : undefined;

  if ((type === 'ajout' || type === 'retrait') && (!quantite || quantite <= 0)) {
    throw createError('quantite invalide', 400);
  }

  if (type === 'ajustement' && (stockPhysique === undefined || stockPhysique < 0)) {
    throw createError('stockPhysique invalide', 400);
  }

  const produitId = new mongoose.Types.ObjectId(payload.produitId);
  const now = new Date();
  let filter = { _id: produitId, boutiqueId };
  let update = {};
  let delta = 0;

  if (type === 'ajout') {
    delta = quantite;
    update = { $inc: { 'stock.quantite': quantite }, $set: { updatedAt: now } };
  } else if (type === 'retrait') {
    delta = -quantite;
    filter = { ...filter, 'stock.quantite': { $gte: quantite } };
    update = { $inc: { 'stock.quantite': -quantite }, $set: { updatedAt: now } };
  } else {
    update = { $set: { 'stock.quantite': stockPhysique, updatedAt: now } };
  }

  const beforeDoc = await Produit.findOneAndUpdate(filter, update, {
    new: false,
    projection: { stock: 1, titre: 1 },
  });

  if (!beforeDoc) {
    const exists = await Produit.findOne({ _id: produitId, boutiqueId })
      .select('_id stock')
      .lean();
    if (!exists) {
      throw createError('Produit introuvable', 404);
    }
    if (type === 'retrait') {
      throw createError('Stock insuffisant', 409);
    }
    throw createError('Mise a jour stock impossible', 400);
  }

  const stockBefore = getStockQty(beforeDoc);
  const stockAfter = type === 'ajustement' ? stockPhysique : stockBefore + delta;
  const effectiveDelta = stockAfter - stockBefore;

  if (!effectiveDelta) {
    return {
      produitId: beforeDoc._id,
      stockAvant: stockBefore,
      stockApres: stockAfter,
      mouvement: null,
    };
  }

  const mouvement = await MouvementStock.create({
    produitId,
    boutiqueId,
    type,
    quantite: Math.abs(effectiveDelta),
    stockAvant: stockBefore,
    stockApres: stockAfter,
    reference,
    userId: auth.userId,
    raison: raison || (type === 'ajustement' ? 'Inventaire' : undefined),
    createdAt: now,
  });

  try {
    await triggerStockAlertIfNeeded({
      produitId,
      boutiqueId,
      stockBefore,
      stockAfter,
      produitTitre: beforeDoc?.titre,
    });
  } catch (error) {
    console.error('Stock alert trigger failed:', error);
  }

  return {
    produitId: beforeDoc._id,
    stockAvant: stockBefore,
    stockApres: stockAfter,
    mouvement,
  };
};
