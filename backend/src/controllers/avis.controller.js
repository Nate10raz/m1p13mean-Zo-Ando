import AvisService from '../services/avis.service.js';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';

/**
 * Créer un avis (Produit ou Boutique).
 */
export const createAvis = async (req, res, next) => {
  try {
    const { type, produitId, boutiqueId, note, titre, commentaire } = req.body;
    const clientId = req.user.id;

    if (!type || !boutiqueId || !note) {
      return res.status(400).json({ message: 'Type, boutiqueId et note sont requis.' });
    }

    if (type === 'produit' && !produitId) {
      return res.status(400).json({ message: 'produitId est requis pour un avis produit.' });
    }

    const avis = await AvisService.createAvis({
      type,
      produitId,
      boutiqueId,
      clientId,
      note,
      titre,
      commentaire,
    });

    res.status(201).json(avis);
  } catch (error) {
    next(error);
  }
};

/**
 * Répondre à un avis.
 */
export const respondToAvis = async (req, res, next) => {
  try {
    const { avisId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const role = req.user.role; // 'admin' ou 'boutique'

    let prenomRepondant = '';
    let nomBoutique = '';
    let boutiqueIdUser = null;

    if (role === 'boutique') {
      const boutique = await Boutique.findOne({ userId });
      if (!boutique)
        return res.status(403).json({ message: 'Boutique non trouvée pour cet utilisateur.' });

      boutiqueIdUser = boutique._id.toString();
      nomBoutique = boutique.nom;

      const user = await User.findById(userId);
      prenomRepondant = user.prenom;
    } else if (role === 'admin') {
      const user = await User.findById(userId);
      prenomRepondant = user.prenom;
    } else {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    const updatedAvis = await AvisService.addReponse(
      avisId,
      userId,
      role,
      message,
      prenomRepondant,
      nomBoutique,
      boutiqueIdUser,
    );

    res.status(200).json(updatedAvis);
  } catch (error) {
    next(error);
  }
};

/**
 * Signaler un avis.
 */
export const reportAvis = async (req, res, next) => {
  try {
    const { avisId } = req.params;
    const { raison } = req.body;
    const userId = req.user.id;

    const updatedAvis = await AvisService.signalerAvis(avisId, userId, raison);
    res.status(200).json(updatedAvis);
  } catch (error) {
    next(error);
  }
};

/**
 * Action sur avis signalé (Admin).
 */
export const adminActionOnReport = async (req, res, next) => {
  try {
    const { avisId } = req.params;
    const { action } = req.body; // 'accepter' ou 'rejeter'

    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Réservé aux admins.' });

    const updatedAvis = await AvisService.handleSignalement(avisId, action);
    res.status(200).json(updatedAvis);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les avis signalés (Admin).
 */
export const getSignaledAvis = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Réservé aux admins.' });

    const avis = await AvisService.getSignaledAvis();
    res.status(200).json(avis);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les avis par produit ou boutique.
 */
export const getAvisByEntity = async (req, res, next) => {
  try {
    const { type, id } = req.params; // type = 'produit' or 'boutique'

    let avis;
    if (type === 'produit') {
      avis = await AvisService.getAvisByProduit(id);
    } else if (type === 'boutique') {
      avis = await AvisService.getAvisByBoutique(id);
    } else {
      return res.status(400).json({ message: 'Type invalide.' });
    }

    res.status(200).json(avis);
  } catch (error) {
    next(error);
  }
};
