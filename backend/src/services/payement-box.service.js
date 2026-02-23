import mongoose from 'mongoose';
import PayementBox from '../models/PayementBox.js';
import Box from '../models/Box.js';
import HistoriquePrixBox from '../models/HistoriquePrixBox.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const requireAuthRole = (auth) => {
  if (!auth || !['admin', 'boutique'].includes(auth.role)) {
    throw createError('Forbidden', 403);
  }
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

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

const formatPeriode = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const normalizePeriode = (value, dateFallback) => {
  if (!value || !String(value).trim()) {
    const baseDate = dateFallback || new Date();
    return formatPeriode(baseDate);
  }
  const periode = String(value).trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) {
    throw createError('periode invalide (format attendu YYYY-MM)', 400);
  }
  return periode;
};

const normalizeStatus = (value) => {
  if (!value) return null;
  const status = String(value).trim();
  if (!['en_attente', 'valide', 'rejete'].includes(status)) {
    throw createError('status invalide', 400);
  }
  return status;
};

const validatePrixBoxe = async (prixBoxeId, boxId) => {
  if (prixBoxeId === undefined) return null;
  if (prixBoxeId === null || prixBoxeId === '') return null;
  if (!mongoose.Types.ObjectId.isValid(prixBoxeId)) {
    throw createError('prixBoxeId invalide', 400);
  }
  const historique = await HistoriquePrixBox.findOne({ _id: prixBoxeId, boxId })
    .select('_id')
    .lean();
  if (!historique) {
    throw createError('Historique prix box introuvable', 404);
  }
  return historique._id;
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
        type: 'payement_box',
        channel: 'in_app',
        titre: notification.titre,
        message: notification.message,
        data: {
          boutiqueId,
        },
      }),
    ),
  );
};

const makeReference = () => {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAYBOX-${stamp}-${rand}`;
};

export const createPayementBox = async (payload, auth) => {
  requireAuthRole(auth);

  if (!payload?.boxId || !mongoose.Types.ObjectId.isValid(payload.boxId)) {
    throw createError('boxId invalide', 400);
  }

  const box = await Box.findById(payload.boxId).lean();
  if (!box) {
    throw createError('Box introuvable', 404);
  }
  if (!box.boutiqueId) {
    throw createError('Box non assignee a une boutique', 409);
  }

  let boutiqueId = box.boutiqueId;
  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    if (box.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
    boutiqueId = user.boutiqueId;
  }

  const montant = Number(payload?.montant);
  if (Number.isNaN(montant) || montant < 0) {
    throw createError('montant invalide', 400);
  }

  const date = payload?.date ? parseDate(payload.date) : null;
  if (payload?.date && !date) {
    throw createError('date invalide', 400);
  }
  const dueDate = payload?.dueDate ? parseDate(payload.dueDate) : null;
  if (payload?.dueDate && !dueDate) {
    throw createError('dueDate invalide', 400);
  }

  const prixBoxeId = await validatePrixBoxe(payload?.prixBoxeId, box._id);
  const basePeriodeDate = box.contrat?.dateDebut ? new Date(box.contrat.dateDebut) : date;
  const periode = normalizePeriode(payload?.periode, basePeriodeDate || new Date());

  let status = 'en_attente';
  if (auth.role === 'admin' && payload?.status) {
    status = normalizeStatus(payload.status);
  }

  const payement = new PayementBox({
    boutiqueId,
    boxId: box._id,
    prixBoxeId,
    reference: makeReference(),
    periode,
    montant,
    date: date || undefined,
    dueDate: dueDate || undefined,
    status,
    createdBy: auth.userId,
    commentaire: payload?.commentaire,
  });

  if (auth.role === 'admin' && status !== 'en_attente') {
    payement.adminId = auth.userId;
    payement.dateValidation = new Date();
  }

  try {
    await payement.save();

    if (payement.status === 'en_attente') {
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
        await Promise.all(
          admins.map((admin) =>
            createNotification({
              userId: admin._id,
              type: 'payement_box',
              channel: 'in_app',
              titre: 'Nouveau paiement de box',
              message: `Paiement en attente ${payement.reference} pour la box ${box.numero}.`,
              data: {
                boutiqueId: boutiqueId,
              },
            }),
          ),
        );
      } catch (notifyError) {
        console.warn('Notification admin (payement en attente) echouee:', notifyError);
      }
    }

    return payement.toObject();
  } catch (error) {
    if (error?.code === 11000) {
      throw createError('Payement deja existant pour cette periode', 409);
    }
    throw error;
  }
};

export const listPayementBoxes = async (
  auth,
  { page = 1, limit = 20, status, boxId, boutiqueId } = {},
) => {
  requireAuthRole(auth);

  const filter = {};
  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    filter.boutiqueId = user.boutiqueId;
  } else if (boutiqueId) {
    if (!mongoose.Types.ObjectId.isValid(boutiqueId)) {
      throw createError('boutiqueId invalide', 400);
    }
    filter.boutiqueId = boutiqueId;
  }

  if (boxId) {
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      throw createError('boxId invalide', 400);
    }
    filter.boxId = boxId;
  }

  if (status) {
    filter.status = normalizeStatus(status);
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    PayementBox.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    PayementBox.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const listPayementBoxesPending = async (auth, { page = 1, limit = 20 } = {}) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }

  const filter = { status: 'en_attente' };
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    PayementBox.find(filter)
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    PayementBox.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const getPayementBoxById = async (id, auth) => {
  requireAuthRole(auth);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const payement = await PayementBox.findById(id).lean();
  if (!payement) {
    throw createError('Payement introuvable', 404);
  }
  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    if (payement.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
  }
  return payement;
};

export const updatePayementBox = async (id, payload, auth) => {
  requireAuthRole(auth);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const payement = await PayementBox.findById(id);
  if (!payement) {
    throw createError('Payement introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    if (payement.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
    if (payement.status !== 'en_attente') {
      throw createError('Payement non modifiable', 400);
    }
  }

  if (payload?.montant !== undefined) {
    const montant = Number(payload.montant);
    if (Number.isNaN(montant) || montant < 0) {
      throw createError('montant invalide', 400);
    }
    payement.montant = montant;
  }

  if (payload?.date !== undefined) {
    const date = parseDate(payload.date);
    if (!date) {
      throw createError('date invalide', 400);
    }
    payement.date = date;
  }

  if (payload?.dueDate !== undefined) {
    if (payload.dueDate === null || payload.dueDate === '') {
      payement.dueDate = undefined;
    } else {
      const dueDate = parseDate(payload.dueDate);
      if (!dueDate) {
        throw createError('dueDate invalide', 400);
      }
      payement.dueDate = dueDate;
    }
  }

  if (payload?.periode !== undefined) {
    payement.periode = normalizePeriode(payload.periode, payement.date || new Date());
  }

  if (payload?.prixBoxeId !== undefined) {
    const prixBoxeId = await validatePrixBoxe(payload.prixBoxeId, payement.boxId);
    payement.prixBoxeId = prixBoxeId;
  }

  if (payload?.commentaire !== undefined) {
    payement.commentaire = payload.commentaire;
  }

  if (auth.role === 'admin' && payload?.status !== undefined) {
    const status = normalizeStatus(payload.status);
    if (['valide', 'rejete'].includes(status) && !String(payload?.commentaire || '').trim()) {
      throw createError('commentaire requis', 400);
    }
    payement.status = status;
    if (status === 'en_attente') {
      payement.adminId = undefined;
      payement.dateValidation = undefined;
    } else {
      payement.adminId = auth.userId;
      payement.dateValidation = new Date();
    }
  }

  try {
    await payement.save();
    return payement.toObject();
  } catch (error) {
    if (error?.code === 11000) {
      throw createError('Payement deja existant pour cette periode', 409);
    }
    throw error;
  }
};

export const deletePayementBox = async (id, auth) => {
  requireAuthRole(auth);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const payement = await PayementBox.findById(id);
  if (!payement) {
    throw createError('Payement introuvable', 404);
  }

  if (auth.role === 'boutique') {
    const user = await requireBoutiqueUser(auth);
    if (payement.boutiqueId.toString() !== user.boutiqueId.toString()) {
      throw createError('Forbidden', 403);
    }
    if (payement.status !== 'en_attente') {
      throw createError('Payement non supprimable', 400);
    }
  }

  await PayementBox.deleteOne({ _id: payement._id });
  return { deleted: true };
};

export const validatePayementBox = async (id, payload, auth) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const payement = await PayementBox.findById(id);
  if (!payement) {
    throw createError('Payement introuvable', 404);
  }
  if (payement.status !== 'en_attente') {
    throw createError('Payement non validable', 400);
  }
  if (!payload?.commentaire || !String(payload.commentaire).trim()) {
    throw createError('commentaire requis', 400);
  }

  payement.status = 'valide';
  payement.adminId = auth.userId;
  payement.dateValidation = new Date();
  payement.commentaire = payload.commentaire;

  await payement.save();
  try {
    await notifyBoutiqueUsers(payement.boutiqueId, {
      titre: 'Paiement box valide',
      message: `Votre paiement ${payement.reference} a ete valide.`,
    });
  } catch (error) {
    console.warn('Notification boutique (payement valide) echouee:', error);
  }
  return payement.toObject();
};

export const rejectPayementBox = async (id, payload, auth) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError('Id invalide', 400);
  }
  const payement = await PayementBox.findById(id);
  if (!payement) {
    throw createError('Payement introuvable', 404);
  }
  if (payement.status !== 'en_attente') {
    throw createError('Payement non rejetable', 400);
  }
  if (!payload?.commentaire || !String(payload.commentaire).trim()) {
    throw createError('commentaire requis', 400);
  }

  payement.status = 'rejete';
  payement.adminId = auth.userId;
  payement.dateValidation = new Date();
  payement.commentaire = payload.commentaire;

  await payement.save();
  try {
    await notifyBoutiqueUsers(payement.boutiqueId, {
      titre: 'Paiement box rejete',
      message: `Votre paiement ${payement.reference} a ete rejete. Motif: ${payload.commentaire}`,
    });
  } catch (error) {
    console.warn('Notification boutique (payement rejete) echouee:', error);
  }
  return payement.toObject();
};
