import mongoose from 'mongoose';
import Box from '../models/Box.js';
import BoxType from '../models/BoxType.js';
import HistoriquePrixBox from '../models/HistoriquePrixBox.js';

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

export const createBox = async (payload, auth) => {
  assertAdmin(auth);

  if (!payload?.numero) throw createError('numero requis', 400);
  if (payload.etage === undefined || payload.etage === null) {
    throw createError('etage requis', 400);
  }
  if (!payload.zone) throw createError('zone requis', 400);
  if (payload.superficie === undefined || payload.superficie === null) {
    throw createError('superficie requis', 400);
  }

  const typeId = payload.typeId;
  if (!typeId || !mongoose.Types.ObjectId.isValid(typeId)) {
    throw createError('typeId invalide', 400);
  }
  const boxType = await BoxType.findById(typeId).lean();
  if (!boxType) {
    throw createError('BoxType introuvable', 404);
  }

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
    const box = new Box({
      numero: payload.numero,
      etage: payload.etage,
      zone: payload.zone,
      allee: payload.allee,
      position: payload.position,
      description: payload.description,
      caracteristiques: Array.isArray(payload.caracteristiques) ? payload.caracteristiques : [],
      photos: Array.isArray(payload.photos) ? payload.photos : [],
      superficie: payload.superficie,
      typeId: boxType._id,
      createdBy: auth.userId,
      estOccupe: false,
      tarifActuel: {
        montant,
        unite,
        dateDebut,
      },
    });

    await box.save({ session });

    const historique = new HistoriquePrixBox({
      boxId: box._id,
      montant,
      unite,
      dateDebut,
      raison: payload?.raison,
      createdBy: auth.userId,
    });
    await historique.save({ session });

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
