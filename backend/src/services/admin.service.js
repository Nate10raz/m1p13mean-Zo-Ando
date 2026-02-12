import mongoose from 'mongoose';
import Boutique from '../models/Boutique.js';
import User from '../models/User.js';

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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      select: 'email nom prenom telephone role isActive createdAt',
    });
  }

  const [itemsRaw, total] = await Promise.all([query, Boutique.countDocuments(filter)]);
  let items = itemsRaw;

  if (includeUser) {
    items = items.map((boutique) => ({
      ...boutique,
      user: boutique.userId || null,
    }));
  }

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
  };
};
