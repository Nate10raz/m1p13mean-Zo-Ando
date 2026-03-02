import mongoose from 'mongoose';
import Avis from '../models/Avis.js';
import Box from '../models/Box.js';
import BoxType from '../models/BoxType.js';
import Boutique from '../models/Boutique.js';
import DemandeLocationBox from '../models/DemandeLocationBox.js';
import PayementBox from '../models/PayementBox.js';
import User from '../models/User.js';
import FraisLivraison from '../models/FraisLivraison.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, __v, ...safe } = user.toObject();
  return safe;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const mapStatusCounts = (rows, statuses) => {
  const counts = {};
  const amounts = {};
  statuses.forEach((status) => {
    counts[status] = 0;
    amounts[status] = 0;
  });

  rows.forEach((row) => {
    if (!row || !row._id) return;
    if (!Object.prototype.hasOwnProperty.call(counts, row._id)) return;
    counts[row._id] = row.count || 0;
    amounts[row._id] = row.amount || 0;
  });

  counts.total = statuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
  amounts.total = statuses.reduce((sum, status) => sum + (amounts[status] || 0), 0);

  return { counts, amounts };
};

const safeId = (value) => (value ? value.toString() : null);

export const approveBoutique = async (boutiqueId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const boutique = await Boutique.findById(boutiqueId).session(session);
    if (!boutique) {
      throw createError('Boutique not found', 404);
    }

    boutique.status = 'active';
    boutique.isActive = true;
    boutique.dateValidation = new Date();
    boutique.motifSuspension = undefined;
    await boutique.save({ session });

    const user = await User.findById(boutique.userId).session(session);
    if (user) {
      user.isActive = true;
      user.status = 'active';
      user.motifSuspension = undefined;
      await user.save({ session });
    }

    await session.commitTransaction();
    return {
      boutique: boutique.toObject(),
      user: sanitizeUser(user),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const suspendBoutique = async (boutiqueId, motif) => {
  if (!motif) {
    throw createError('Motif requis', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const boutique = await Boutique.findById(boutiqueId).session(session);
    if (!boutique) {
      throw createError('Boutique not found', 404);
    }

    boutique.status = 'suspendue';
    boutique.isActive = false;
    boutique.motifSuspension = motif;
    await boutique.save({ session });

    const user = await User.findById(boutique.userId).session(session);
    if (user) {
      user.isActive = false;
      user.status = 'suspendue';
      user.motifSuspension = motif;
      await user.save({ session });
    }

    await session.commitTransaction();
    return {
      boutique: boutique.toObject(),
      user: sanitizeUser(user),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const rejectBoutique = async (boutiqueId, motif) => {
  if (!motif) {
    throw createError('Motif requis', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const boutique = await Boutique.findById(boutiqueId).session(session);
    if (!boutique) {
      throw createError('Boutique not found', 404);
    }

    boutique.status = 'rejetee';
    boutique.isActive = false;
    boutique.motifSuspension = motif;
    await boutique.save({ session });

    const user = await User.findById(boutique.userId).session(session);
    if (user) {
      user.isActive = false;
      user.status = 'rejetee';
      user.motifSuspension = motif;
      await user.save({ session });
    }

    await session.commitTransaction();
    return {
      boutique: boutique.toObject(),
      user: sanitizeUser(user),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const reactivateBoutique = async (boutiqueId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const boutique = await Boutique.findById(boutiqueId).session(session);
    if (!boutique) {
      throw createError('Boutique not found', 404);
    }

    boutique.status = 'active';
    boutique.isActive = true;
    boutique.motifSuspension = undefined;
    if (!boutique.dateValidation) {
      boutique.dateValidation = new Date();
    }
    await boutique.save({ session });

    const user = await User.findById(boutique.userId).session(session);
    if (user) {
      user.isActive = true;
      user.status = 'active';
      user.motifSuspension = undefined;
      await user.save({ session });
    }

    await session.commitTransaction();
    return {
      boutique: boutique.toObject(),
      user: sanitizeUser(user),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const listPendingBoutiques = async ({
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortDir = 'desc',
  search = '',
  includeUser = false,
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const allowedSort = ['createdAt', 'nom', 'status'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;

  const filter = { status: 'en_attente' };
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ nom: regex }, { email: regex }, { telephone: regex }, { adresse: regex }];
  }

  let query = Boutique.find(filter)
    .sort({ [sortField]: sortDirection })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .lean();

  if (includeUser) {
    query = query.populate({
      path: 'userId',
      select: 'email nom prenom telephone role status isActive createdAt',
    });
  }

  const [itemsRaw, total] = await Promise.all([query, Boutique.countDocuments(filter)]);
  let items = itemsRaw;

  if (includeUser) {
    items = items.map((boutique) => {
      const hasPopulatedUser = boutique.userId && boutique.userId._id;
      const user = hasPopulatedUser ? boutique.userId : null;
      const userId = hasPopulatedUser ? boutique.userId._id : boutique.userId || null;
      return {
        ...boutique,
        userId,
        user,
      };
    });
  }

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const listBoutiques = async ({
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortDir = 'desc',
  search = '',
  includeUser = false,
  status,
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const allowedSort = ['createdAt', 'nom', 'status'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;

  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ nom: regex }, { email: regex }, { telephone: regex }, { adresse: regex }];
  }

  let query = Boutique.find(filter)
    .sort({ [sortField]: sortDirection })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .lean();

  if (includeUser) {
    query = query.populate({
      path: 'userId',
      select: 'email nom prenom telephone role status isActive createdAt',
    });
  }

  const [itemsRaw, total] = await Promise.all([query, Boutique.countDocuments(filter)]);
  let items = itemsRaw;

  if (includeUser) {
    items = items.map((boutique) => {
      const hasPopulatedUser = boutique.userId && boutique.userId._id;
      const user = hasPopulatedUser ? boutique.userId : null;
      const userId = hasPopulatedUser ? boutique.userId._id : boutique.userId || null;
      return {
        ...boutique,
        userId,
        user,
      };
    });
  }

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const suspendUser = async (userId, motif) => {
  if (!motif) {
    throw createError('Motif requis', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError('User not found', 404);
  }
  if (user.role !== 'client') {
    throw createError('Only client accounts can be suspended here', 400);
  }

  user.isActive = false;
  user.status = 'suspendue';
  user.motifSuspension = motif;
  await user.save();

  return {
    user: sanitizeUser(user),
  };
};

export const reactivateUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw createError('User not found', 404);
  }
  if (user.role !== 'client') {
    throw createError('Only client accounts can be reactivated here', 400);
  }

  user.isActive = true;
  user.status = 'active';
  user.motifSuspension = undefined;
  await user.save();

  return {
    user: sanitizeUser(user),
  };
};

export const listClients = async ({
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortDir = 'desc',
  search = '',
  status,
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const allowedSort = ['createdAt', 'nom', 'prenom', 'status'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;

  const filter = { role: 'client' };
  if (status) {
    filter.status = status;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ nom: regex }, { prenom: regex }, { email: regex }, { telephone: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((user) => {
      const { passwordHash, __v, ...safe } = user;
      return safe;
    }),
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
  };
};

export const getAdminFinanceDashboard = async (
  { startDate, endDate, topN } = {},
  auth = { role: null },
) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }

  const { start, end } = resolveDateRange(startDate, endDate);
  const limit = clampTopN(topN, 5);
  const periodMatch = { createdAt: { $gte: start, $lte: end } };
  const effectiveDateExpr = { $ifNull: ['$dateValidation', { $ifNull: ['$date', '$createdAt'] }] };
  const boxCollection = Box.collection.name;
  const boxTypeCollection = BoxType.collection.name;
  const boutiqueCollection = Boutique.collection.name;

  const [
    payementStatusAgg,
    revenueCollectedAgg,
    arrearsAgg,
    revenueByZone,
    revenueByEtage,
    revenueByType,
    revenueByBoutique,
    rentAgg,
    occupancyAgg,
    occupancyByZone,
    occupancyByType,
    demandesCountsAgg,
    demandesDecisionAgg,
    boutiqueStatusAgg,
    userRoleAgg,
    clientsActifs,
    avisAgg,
  ] = await Promise.all([
    PayementBox.aggregate([
      { $match: periodMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$montant' },
        },
      },
    ]),
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, amount: { $sum: '$montant' }, count: { $sum: 1 } } },
    ]),
    PayementBox.aggregate([
      {
        $match: {
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
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      { $lookup: { from: boxCollection, localField: 'boxId', foreignField: '_id', as: 'box' } },
      { $unwind: '$box' },
      {
        $group: {
          _id: '$box.zone',
          amount: { $sum: '$montant' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      { $lookup: { from: boxCollection, localField: 'boxId', foreignField: '_id', as: 'box' } },
      { $unwind: '$box' },
      {
        $group: {
          _id: '$box.etage',
          amount: { $sum: '$montant' },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      { $lookup: { from: boxCollection, localField: 'boxId', foreignField: '_id', as: 'box' } },
      { $unwind: '$box' },
      {
        $group: {
          _id: '$box.typeId',
          amount: { $sum: '$montant' },
          count: { $sum: 1 },
        },
      },
      { $lookup: { from: boxTypeCollection, localField: '_id', foreignField: '_id', as: 'type' } },
      { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          amount: 1,
          count: 1,
          typeNom: '$type.nom',
        },
      },
      { $sort: { amount: -1 } },
    ]),
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$boutiqueId',
          amount: { $sum: '$montant' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: boutiqueCollection,
          localField: '_id',
          foreignField: '_id',
          as: 'boutique',
        },
      },
      { $unwind: { path: '$boutique', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          amount: 1,
          count: 1,
          boutiqueNom: '$boutique.nom',
        },
      },
      { $sort: { amount: -1 } },
    ]),
    PayementBox.aggregate([
      { $addFields: { effectiveDate: effectiveDateExpr } },
      {
        $match: {
          status: 'valide',
          effectiveDate: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$boxId', amount: { $sum: '$montant' } } },
      { $lookup: { from: boxCollection, localField: '_id', foreignField: '_id', as: 'box' } },
      { $unwind: { path: '$box', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          boxesCount: { $sum: 1 },
          totalSuperficie: { $sum: '$box.superficie' },
        },
      },
    ]),
    Box.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          occupied: {
            $sum: {
              $cond: [{ $eq: ['$estOccupe', true] }, 1, 0],
            },
          },
        },
      },
    ]),
    Box.aggregate([
      {
        $group: {
          _id: '$zone',
          total: { $sum: 1 },
          occupied: {
            $sum: {
              $cond: [{ $eq: ['$estOccupe', true] }, 1, 0],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Box.aggregate([
      {
        $group: {
          _id: '$typeId',
          total: { $sum: 1 },
          occupied: {
            $sum: {
              $cond: [{ $eq: ['$estOccupe', true] }, 1, 0],
            },
          },
        },
      },
      { $lookup: { from: boxTypeCollection, localField: '_id', foreignField: '_id', as: 'type' } },
      { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, total: 1, occupied: 1, typeNom: '$type.nom' } },
      { $sort: { total: -1 } },
    ]),
    DemandeLocationBox.aggregate([
      { $match: periodMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DemandeLocationBox.aggregate([
      {
        $match: {
          status: { $in: ['validee', 'rejetee'] },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $addFields: {
          decisionDate: { $ifNull: ['$dateValidation', { $max: '$historique.date' }] },
        },
      },
      { $match: { decisionDate: { $ne: null } } },
      {
        $project: {
          decisionDelayDays: {
            $divide: [{ $subtract: ['$decisionDate', '$createdAt'] }, 86400000],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDecisionDays: { $avg: '$decisionDelayDays' },
          minDecisionDays: { $min: '$decisionDelayDays' },
          maxDecisionDays: { $max: '$decisionDelayDays' },
        },
      },
    ]),
    Boutique.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'client', isActive: true }),
    Avis.aggregate([{ $group: { _id: null, avgNote: { $avg: '$note' }, count: { $sum: 1 } } }]),
  ]);

  const { counts: payementCounts, amounts: payementAmounts } = mapStatusCounts(payementStatusAgg, [
    'valide',
    'en_attente',
    'rejete',
  ]);

  const revenueCollected = revenueCollectedAgg[0] || { amount: 0, count: 0 };
  const arrearsInfo = arrearsAgg[0] || { amount: 0, count: 0 };
  const rentInfo = rentAgg[0] || { totalRevenue: 0, boxesCount: 0, totalSuperficie: 0 };
  const occupancyInfo = occupancyAgg[0] || { total: 0, occupied: 0 };
  const demandesCounts = mapStatusCounts(demandesCountsAgg, [
    'en_attente',
    'validee',
    'rejetee',
    'annulee',
  ]).counts;
  const demandesDecision = demandesDecisionAgg[0] || {
    avgDecisionDays: 0,
    minDecisionDays: 0,
    maxDecisionDays: 0,
  };
  const boutiqueCounts = mapStatusCounts(boutiqueStatusAgg, [
    'active',
    'suspendue',
    'en_attente',
    'rejetee',
  ]).counts;

  const userRoles = mapStatusCounts(userRoleAgg, ['admin', 'boutique', 'client']).counts;
  const avisInfo = avisAgg[0] || { avgNote: 0, count: 0 };

  const expectedAmount = (payementAmounts.valide || 0) + (payementAmounts.en_attente || 0);
  const paymentRate = expectedAmount > 0 ? (revenueCollected.amount || 0) / expectedAmount : 0;
  const averageRentPerBox =
    rentInfo.boxesCount > 0 ? rentInfo.totalRevenue / rentInfo.boxesCount : 0;
  const revenuePerM2 =
    rentInfo.totalSuperficie > 0 ? rentInfo.totalRevenue / rentInfo.totalSuperficie : 0;
  const occupancyRate = occupancyInfo.total > 0 ? occupancyInfo.occupied / occupancyInfo.total : 0;

  return {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    currency: 'MGA',
    topN: limit,
    location: {
      revenueCollected: revenueCollected.amount || 0,
      revenueCollectedCount: revenueCollected.count || 0,
      revenueExpected: expectedAmount,
      paymentRate,
      payments: {
        counts: payementCounts,
        amounts: payementAmounts,
      },
      arrears: {
        asOf: end.toISOString(),
        amount: arrearsInfo.amount || 0,
        count: arrearsInfo.count || 0,
      },
      pendingAmount: payementAmounts.en_attente || 0,
      averageRentPerBox,
      revenuePerM2,
      revenueByZone: revenueByZone.slice(0, limit).map((row) => ({
        zone: row._id || 'non_defini',
        amount: row.amount || 0,
        amountFormatted: formatMGA(row.amount || 0),
        count: row.count || 0,
      })),
      revenueByEtage: revenueByEtage.slice(0, limit).map((row) => ({
        etage: row._id === null || row._id === undefined ? 'non_defini' : row._id,
        amount: row.amount || 0,
        amountFormatted: formatMGA(row.amount || 0),
        count: row.count || 0,
      })),
      revenueByType: revenueByType.slice(0, limit).map((row) => ({
        typeId: safeId(row._id),
        typeNom: row.typeNom || null,
        amount: row.amount || 0,
        amountFormatted: formatMGA(row.amount || 0),
        count: row.count || 0,
      })),
      revenueByBoutique: revenueByBoutique.slice(0, limit).map((row) => ({
        boutiqueId: safeId(row._id),
        boutiqueNom: row.boutiqueNom || null,
        amount: row.amount || 0,
        amountFormatted: formatMGA(row.amount || 0),
        count: row.count || 0,
      })),
    },
    occupancy: {
      totalBoxes: occupancyInfo.total || 0,
      occupiedBoxes: occupancyInfo.occupied || 0,
      occupancyRate,
      byZone: occupancyByZone.slice(0, limit).map((row) => ({
        zone: row._id || 'non_defini',
        total: row.total || 0,
        occupied: row.occupied || 0,
        occupancyRate: row.total > 0 ? row.occupied / row.total : 0,
      })),
      byType: occupancyByType.slice(0, limit).map((row) => ({
        typeId: safeId(row._id),
        typeNom: row.typeNom || null,
        total: row.total || 0,
        occupied: row.occupied || 0,
        occupancyRate: row.total > 0 ? row.occupied / row.total : 0,
      })),
    },
    demandesLocation: {
      counts: demandesCounts,
      avgDecisionDays: demandesDecision.avgDecisionDays || 0,
      minDecisionDays: demandesDecision.minDecisionDays || 0,
      maxDecisionDays: demandesDecision.maxDecisionDays || 0,
    },
    boutiques: {
      total: boutiqueCounts.total || 0,
      byStatus: boutiqueCounts,
    },
    users: {
      total: userRoles.total || 0,
      byRole: userRoles,
      clientsActifs,
    },
    satisfaction: {
      avisCount: avisInfo.count || 0,
      noteMoyenne: avisInfo.avgNote || 0,
    },
    display: {
      currency: 'MGA',
      revenueCollected: formatMGA(revenueCollected.amount || 0),
      revenueExpected: formatMGA(expectedAmount || 0),
      pendingAmount: formatMGA(payementAmounts.en_attente || 0),
      arrearsAmount: formatMGA(arrearsInfo.amount || 0),
      averageRentPerBox: formatMGA(averageRentPerBox),
      revenuePerM2: formatMGA(revenuePerM2),
      paymentRate: formatPercent(paymentRate),
      occupancyRate: formatPercent(occupancyRate),
      satisfactionNote: roundNumber(avisInfo.avgNote || 0, 2),
      avgDecisionDays: roundNumber(demandesDecision.avgDecisionDays || 0, 2),
    },
  };
};

export const getFraisLivraisonSupermarche = async () => {
  return await FraisLivraison.findOne({ boutiqueId: null, estActif: true }).sort({ createdAt: -1 });
};

export const updateFraisLivraisonSupermarche = async (userId, data) => {
  if (data.montant === undefined || data.montant === null) {
    throw createError('Le montant est requis', 400);
  }

  // Deactivate old global fees
  await FraisLivraison.updateMany({ boutiqueId: null, estActif: true }, { estActif: false });

  // Create new global fee
  const newFee = new FraisLivraison({
    boutiqueId: null,
    montant: parseFloat(data.montant),
    type: data.type || 'fixe',
    creePar: userId,
    estActif: true,
    description: data.description || "Mis à jour par l'administrateur",
  });

  await newFee.save();
  return newFee;
};

export const getFraisLivraisonHistory = async ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const filter = { boutiqueId: null };
  const items = await FraisLivraison.find(filter)
    .sort({ createdAt: -1 })
    .skip((parsedPage - 1) * parsedLimit)
    .limit(parsedLimit)
    .populate('creePar', 'nom prenom')
    .lean();

  const total = await FraisLivraison.countDocuments(filter);

  return {
    items,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit),
  };
};
