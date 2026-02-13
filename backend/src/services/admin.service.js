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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
