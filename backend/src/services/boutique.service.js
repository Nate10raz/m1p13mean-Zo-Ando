import Boutique from '../models/Boutique.js';
import User from '../models/User.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

export const getBoutiqueById = async (id) => {
  const boutique = await Boutique.findById(id).lean();
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }
  return boutique;
};

export const updateBoutique = async (id, userId, data) => {
  const boutique = await Boutique.findById(id);
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }

  // Ownership check: userId must match boutique.userId
  if (boutique.userId.toString() !== userId) {
    throw createError('Accès refusé : vous n\'êtes pas le propriétaire de cette boutique', 403);
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
  ];

  Object.keys(data).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      boutique[key] = data[key];
    }
  });

  await boutique.save();
  return boutique;
};


