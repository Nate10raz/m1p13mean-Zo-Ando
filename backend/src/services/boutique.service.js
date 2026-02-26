import mongoose from 'mongoose';
import AlerteStock from '../models/AlerteStock.js';
import Avis from '../models/Avis.js';
import Category from '../models/Category.js';
import Commande from '../models/Commande.js';
import Boutique from '../models/Boutique.js';
import Panier from '../models/Panier.js';
import PayementBox from '../models/PayementBox.js';
import Produit from '../models/Produit.js';
import User from '../models/User.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
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
  return `${rounded.toLocaleString('fr-FR')} MGA`;
};

const formatPercent = (value) => `${roundNumber(Number(value || 0) * 100, 2)}%`;

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

  const boutique = await Boutique.findById(user.boutiqueId).lean();
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }
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
        $match: {
          $expr: { $lte: ['$stock.quantite', '$stock.seuilAlerte'] },
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
