import mongoose from 'mongoose';
import DemandeLocationBox from '../models/DemandeLocationBox.js';
import Box from '../models/Box.js';
import Boutique from '../models/Boutique.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';
import { ENV } from '../config/env.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const requireBoutiqueUser = async (auth) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }
  const user = await User.findById(auth.userId).lean();
  if (!user || !user.boutiqueId) {
    throw createError('Boutique utilisateur introuvable', 404);
  }
  return user;
};

const requireAdmin = (auth) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }
};

const notifyBoutiqueUsers = async (boutiqueId, notification) => {
  if (!boutiqueId) return;
  const users = await User.find({ boutiqueId, role: 'boutique', isActive: true })
    .select('_id')
    .lean();
  if (!users.length) return;
  await Promise.all(
    users.map((user) =>
      createNotification({
        userId: user._id,
        type: 'demande_location_box',
        channel: 'in_app',
        titre: notification.titre,
        message: notification.message,
        data: notification.data,
      }),
    ),
  );
};

export const createDemandeLocationBox = async (payload, auth) => {
  const user = await requireBoutiqueUser(auth);

  if (!payload?.boxId || !mongoose.Types.ObjectId.isValid(payload.boxId)) {
    throw createError('boxId invalide', 400);
  }
  const dateDebut = parseDate(payload?.dateDebut);
  if (!dateDebut) {
    throw createError('dateDebut invalide', 400);
  }

  const box = await Box.findById(payload.boxId).lean();
  if (!box) {
    throw createError('Box introuvable', 404);
  }
  if (box.estOccupe) {
    throw createError('Box deja occupee', 409);
  }

  const boutique = await Boutique.findById(user.boutiqueId).lean();
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }
  const demande = new DemandeLocationBox({
    boutiqueId: boutique._id,
    boxId: box._id,
    dateDebut,
  });

  await demande.save();

  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id,
        type: 'demande_location_box',
        channel: 'in_app',
        titre: 'Nouvelle demande de location',
        message: `Nouvelle demande pour la box ${box.numero} par la boutique ${boutique.nom}.`,
        data: {
          boxId: box._id,
          boutiqueId: boutique._id,
        },
      }),
    ),
  );

  return demande.toObject();
};

export const listDemandesLocationBox = async (
  auth,
  { page = 1, limit = 20, status, boxId, boutiqueId } = {},
) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }

  const filter = {};

  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    filter.boutiqueId = user.boutiqueId;
  } else {
    if (boxId) {
      if (!mongoose.Types.ObjectId.isValid(boxId)) {
        throw createError('boxId invalide', 400);
      }
      filter.boxId = boxId;
    }
    if (boutiqueId) {
      if (!mongoose.Types.ObjectId.isValid(boutiqueId)) {
        throw createError('boutiqueId invalide', 400);
      }
      filter.boutiqueId = boutiqueId;
    }
  }

  if (status) {
    if (!['en_attente', 'validee', 'rejetee', 'annulee'].includes(status)) {
      throw createError('status invalide', 400);
    }
    filter.status = status;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    DemandeLocationBox.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    DemandeLocationBox.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const listDemandesLocationBoxPending = async (auth, { page = 1, limit = 20 } = {}) => {
  requireAdmin(auth);

  const filter = { status: 'en_attente' };
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    DemandeLocationBox.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    DemandeLocationBox.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const listMyDemandesLocationBox = async (auth, { page = 1, limit = 20, status } = {}) => {
  const user = await requireBoutiqueUser(auth);

  const filter = { boutiqueId: user.boutiqueId };
  if (status) {
    if (!['en_attente', 'validee', 'rejetee', 'annulee'].includes(status)) {
      throw createError('status invalide', 400);
    }
    filter.status = status;
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    DemandeLocationBox.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    DemandeLocationBox.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const getDemandeLocationBox = async (id, auth) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const demande = await DemandeLocationBox.findById(id).lean();
  if (!demande) {
    throw createError('Demande introuvable', 404);
  }

  if (auth?.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    if (demande.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  } else if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }

  return demande;
};

export const cancelDemandeLocationBox = async (id, auth) => {
  const user = await requireBoutiqueUser(auth);
  const demande = await DemandeLocationBox.findById(id);
  if (!demande) {
    throw createError('Demande introuvable', 404);
  }
  if (demande.boutiqueId.toString() !== user.boutiqueId.toString()) {
    throw createError('Forbidden', 403);
  }
  if (demande.status !== 'en_attente') {
    throw createError('Demande non annulable', 400);
  }

  demande.status = 'annulee';
  await demande.save();
  return demande.toObject();
};

export const approveDemandeLocationBox = async (id, payload, auth) => {
  requireAdmin(auth);

  const session = await mongoose.startSession();
  session.startTransaction();

  let notification = null;
  try {
    const demande = await DemandeLocationBox.findById(id).session(session);
    if (!demande) {
      throw createError('Demande introuvable', 404);
    }
    if (demande.status !== 'en_attente') {
      throw createError('Demande non validable', 400);
    }

    if (!payload?.commentaire || !String(payload.commentaire).trim()) {
      throw createError('commentaire requis', 400);
    }

    const box = await Box.findById(demande.boxId).session(session);
    if (!box) {
      throw createError('Box introuvable', 404);
    }
    if (box.estOccupe) {
      if (!box.boutiqueId || box.boutiqueId.toString() !== demande.boutiqueId.toString()) {
        throw createError('Box deja occupee', 409);
      }
    }

    const boutique = await Boutique.findById(demande.boutiqueId).session(session);
    if (!boutique) {
      throw createError('Boutique introuvable', 404);
    }
    const maxBoxes = ENV.MAX_ACTIVE_BOXES_PER_BOUTIQUE || 0;
    if (maxBoxes > 0) {
      const activeCount = await Box.countDocuments({
        boutiqueId: boutique._id,
        estOccupe: true,
      }).session(session);
      const isSameBox = box.boutiqueId && box.boutiqueId.toString() === boutique._id.toString();
      if (!isSameBox && activeCount >= maxBoxes) {
        throw createError('Nombre maximum de box atteint', 409);
      }
    }

    box.estOccupe = true;
    box.boutiqueId = boutique._id;
    box.contrat = {
      dateDebut: demande.dateDebut,
      reference: box.contrat?.reference,
      dateFin: box.contrat?.dateFin,
    };
    await box.save({ session });

    const existingBoxIds = Array.isArray(boutique.boxIds)
      ? boutique.boxIds
      : Array.isArray(boutique.boxId)
        ? boutique.boxId
        : boutique.boxId
          ? [boutique.boxId]
          : [];
    const boxIdString = box._id.toString();
    const alreadyLinked = existingBoxIds.some((id) => id.toString() === boxIdString);
    if (!alreadyLinked) {
      existingBoxIds.push(box._id);
      boutique.boxIds = existingBoxIds;
      await boutique.save({ session });
    }

    demande.status = 'validee';
    demande.adminId = auth.userId;
    demande.dateValidation = new Date();
    demande.motif = payload.commentaire;
    demande.historique = Array.isArray(demande.historique) ? demande.historique : [];
    demande.historique.push({
      status: 'validee',
      commentaire: payload.commentaire,
      adminId: auth.userId,
    });
    await demande.save({ session });

    notification = {
      boutiqueId: boutique._id,
      titre: 'Demande de location validee',
      message: `Votre demande pour la box ${box.numero} a ete validee.`,
      data: {
        demandeId: demande._id,
        boxId: box._id,
        status: 'validee',
      },
    };

    await session.commitTransaction();
    const result = demande.toObject();
    if (notification) {
      try {
        await notifyBoutiqueUsers(notification.boutiqueId, notification);
      } catch (error) {
        console.warn('Notification boutique (validation) echouee:', error);
      }
    }
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const rejectDemandeLocationBox = async (id, payload, auth) => {
  requireAdmin(auth);
  const demande = await DemandeLocationBox.findById(id);
  if (!demande) {
    throw createError('Demande introuvable', 404);
  }
  if (demande.status !== 'en_attente') {
    throw createError('Demande non rejetable', 400);
  }
  if (!payload?.commentaire || !String(payload.commentaire).trim()) {
    throw createError('commentaire requis', 400);
  }

  demande.status = 'rejetee';
  demande.motif = payload.commentaire;
  demande.adminId = auth.userId;
  demande.dateValidation = new Date();
  demande.historique = Array.isArray(demande.historique) ? demande.historique : [];
  demande.historique.push({
    status: 'rejetee',
    commentaire: payload.commentaire,
    adminId: auth.userId,
  });
  await demande.save();

  try {
    await notifyBoutiqueUsers(demande.boutiqueId, {
      titre: 'Demande de location rejetee',
      message: `Votre demande de location a ete rejetee. Motif: ${payload.commentaire}`,
      data: {
        demandeId: demande._id,
        boxId: demande.boxId,
        status: 'rejetee',
      },
    });
  } catch (error) {
    console.warn('Notification boutique (rejet) echouee:', error);
  }

  return demande.toObject();
};
