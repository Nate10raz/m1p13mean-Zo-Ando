import mongoose from 'mongoose';
import Box from '../models/Box.js';
import HistoriquePrixBox from '../models/HistoriquePrixBox.js';
import BoxType from '../models/BoxType.js';
import User from '../models/User.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

const assertAdmin = (auth) => {
  if (!auth || auth.role !== 'admin') {
    throw createError('Forbidden', 403);
  }
};

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
};

export const updateBoxTarif = async (boxId, payload, auth) => {
  assertAdmin(auth);

  const montant = Number(payload?.montant);
  if (Number.isNaN(montant) || montant < 0) {
    throw createError('montant invalide', 400);
  }
  const unite = payload?.unite;
  if (!['mois', 'annee'].includes(unite)) {
    throw createError('unite invalide', 400);
  }
  const dateDebut = parseDate(payload?.dateDebut);
  if (!dateDebut) {
    throw createError('dateDebut invalide', 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const box = await Box.findById(boxId).session(session);
    if (!box) {
      throw createError('Box introuvable', 404);
    }

    await HistoriquePrixBox.updateMany(
      { boxId: box._id, $or: [{ dateFin: { $exists: false } }, { dateFin: null }] },
      { $set: { dateFin: dateDebut } },
      { session },
    );

    const historique = new HistoriquePrixBox({
      boxId: box._id,
      montant,
      unite,
      dateDebut,
      raison: payload?.raison,
      createdBy: auth.userId,
    });

    await historique.save({ session });

    box.tarifActuel = {
      montant,
      unite,
      dateDebut,
    };
    await box.save({ session });

    await session.commitTransaction();
    return {
      box: box.toObject(),
      historique: historique.toObject(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const queryBoxes = async ({
  page = 1,
  limit = 20,
  search,
  estOccupe,
  zone,
  etage,
  typeId,
} = {}) => {
  const filter = {};
  const normalizedEstOccupe =
    typeof estOccupe === 'boolean'
      ? estOccupe
      : typeof estOccupe === 'string'
        ? estOccupe.toLowerCase().trim() === 'true'
          ? true
          : estOccupe.toLowerCase().trim() === 'false'
            ? false
            : undefined
        : undefined;

  if (normalizedEstOccupe !== undefined) {
    filter.estOccupe = normalizedEstOccupe ? true : { $ne: true };
  }
  if (zone) {
    const regex = new RegExp(`^${escapeRegex(zone)}$`, 'i');
    filter.zone = regex;
  }
  if (etage !== undefined && etage !== null && etage !== '') {
    const parsed = parseInt(etage, 10);
    if (Number.isNaN(parsed)) {
      throw createError('etage invalide', 400);
    }
    filter.etage = parsed;
  }
  if (typeId) {
    if (!mongoose.Types.ObjectId.isValid(typeId)) {
      throw createError('typeId invalide', 400);
    }
    filter.typeId = typeId;
  }
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { numero: regex },
      { zone: regex },
      { allee: regex },
      { position: regex },
      { description: regex },
    ];
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total] = await Promise.all([
    Box.find(filter)
      .populate('typeId', 'nom')
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean(),
    Box.countDocuments(filter),
  ]);

  return {
    items,
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
  };
};

export const listBoxes = async (
  auth,
  { page = 1, limit = 20, search, estOccupe, zone, etage, typeId } = {},
) => {
  assertAdmin(auth);
  return queryBoxes({ page, limit, search, estOccupe, zone, etage, typeId });
};

export const listAvailableBoxesForBoutique = async (
  auth,
  { page = 1, limit = 20, search, zone, etage, typeId } = {},
) => {
  if (!auth || auth.role !== 'boutique') {
    throw createError('Forbidden', 403);
  }

  const user = await User.findById(auth.userId).lean();
  if (!user || !user.boutiqueId) {
    throw createError('Boutique utilisateur introuvable', 404);
  }

  return queryBoxes({
    page,
    limit,
    search,
    zone,
    etage,
    typeId,
    estOccupe: false,
  });
};

export const getBoxById = async (boxId, auth) => {
  assertAdmin(auth);

  const box = await Box.findById(boxId).populate('typeId', 'nom').lean();
  if (!box) {
    throw createError('Box introuvable', 404);
  }
  return box;
};

export const updateBox = async (boxId, payload, auth) => {
  assertAdmin(auth);

  const box = await Box.findById(boxId);
  if (!box) {
    throw createError('Box introuvable', 404);
  }

  if (payload.numero !== undefined) box.numero = payload.numero;
  if (payload.etage !== undefined) box.etage = payload.etage;
  if (payload.zone !== undefined) box.zone = payload.zone;
  if (payload.allee !== undefined) box.allee = payload.allee;
  if (payload.position !== undefined) box.position = payload.position;
  if (payload.description !== undefined) box.description = payload.description;
  if (payload.superficie !== undefined) box.superficie = payload.superficie;
  if (payload.caracteristiques !== undefined) {
    if (!Array.isArray(payload.caracteristiques)) {
      throw createError('caracteristiques invalide', 400);
    }
    box.caracteristiques = payload.caracteristiques;
  }
  if (payload.photos !== undefined) {
    if (!Array.isArray(payload.photos)) {
      throw createError('photos invalide', 400);
    }
    box.photos = payload.photos;
  }
  if (payload.estOccupe !== undefined) box.estOccupe = Boolean(payload.estOccupe);
  if (payload.typeId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(payload.typeId)) {
      throw createError('typeId invalide', 400);
    }
    const boxType = await BoxType.findById(payload.typeId).lean();
    if (!boxType) {
      throw createError('BoxType introuvable', 404);
    }
    box.typeId = payload.typeId;
  }

  await box.save();
  return box.toObject();
};

export const deleteBox = async (boxId, auth) => {
  assertAdmin(auth);
  const box = await Box.findById(boxId);
  if (!box) {
    throw createError('Box introuvable', 404);
  }
  if (box.estOccupe) {
    throw createError('Suppression impossible: box occupee', 409);
  }
  await Box.deleteOne({ _id: boxId });
  await HistoriquePrixBox.deleteMany({ boxId });
  return { deleted: true };
};
