import Boutique from '../models/Boutique.js';
import User from '../models/User.js';

const createError = (message, status = 400, data = null) => {
  const err = new Error(message);
  err.status = status;
  err.data = data;
  return err;
};

export const getMyBoutique = async (userId) => {
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

  const boutique = await Boutique.findById(user.boutiqueId).lean();
  if (!boutique) {
    throw createError('Boutique introuvable', 404);
  }
  return boutique;
};
