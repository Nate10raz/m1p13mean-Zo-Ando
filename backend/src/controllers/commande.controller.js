import * as commandeService from '../services/commande.service.js';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';

export const createCommande = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const commande = await commandeService.createCommande(userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: commande,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCommandes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const commandes = await commandeService.getClientCommandes(userId);
    res.status(200).json({
      success: true,
      data: commandes,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoutiqueCommandes = async (req, res, next) => {
  try {
    let { boutiqueId } = req.user;
    if (!boutiqueId && req.user.role === 'boutique') {
      const user = await User.findById(req.user.id);
      if (user) boutiqueId = user.boutiqueId;

      if (!boutiqueId) {
        const boutique = await Boutique.findOne({ userId: req.user.id });
        if (boutique) boutiqueId = boutique._id;
      }
    }

    const commandes = boutiqueId ? await commandeService.getBoutiqueCommandes(boutiqueId) : [];
    res.status(200).json({
      success: true,
      data: commandes,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCommandes = async (req, res, next) => {
  try {
    const commandes = await commandeService.getAllCommandes();
    res.status(200).json({
      success: true,
      data: commandes,
    });
  } catch (error) {
    next(error);
  }
};

export const getCommandeDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const commande = await commandeService.getCommandeById(id, userId, role);
    res.status(200).json({
      success: true,
      data: commande,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { boutiqueId } = req.user;
    if (!boutiqueId && req.user.role === 'boutique') {
      const user = await User.findById(req.user.id);
      if (user) boutiqueId = user.boutiqueId;
      if (!boutiqueId) {
        const boutique = await Boutique.findOne({ userId: req.user.id });
        if (boutique) boutiqueId = boutique._id;
      }
    }
    if (!boutiqueId) throw new Error('Boutique non identifiée');

    const commande = await commandeService.acceptBoutiqueOrder(id, boutiqueId);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const markDepot = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { boutiqueId } = req.user;
    if (!boutiqueId && req.user.role === 'boutique') {
      const user = await User.findById(req.user.id);
      if (user) boutiqueId = user.boutiqueId;
      if (!boutiqueId) {
        const boutique = await Boutique.findOne({ userId: req.user.id });
        if (boutique) boutiqueId = boutique._id;
      }
    }
    if (!boutiqueId) throw new Error('Boutique non identifiée');

    const commande = await commandeService.markBoutiqueDeliveredToDepot(id, boutiqueId);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const startBoutiqueDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { boutiqueId } = req.user;
    if (!boutiqueId && req.user.role === 'boutique') {
      const user = await User.findById(req.user.id);
      if (user) boutiqueId = user.boutiqueId;
      if (!boutiqueId) {
        const boutique = await Boutique.findOne({ userId: req.user.id });
        if (boutique) boutiqueId = boutique._id;
      }
    }
    if (!boutiqueId) throw new Error('Boutique non identifiée');

    const commande = await commandeService.startBoutiqueDelivery(id, boutiqueId);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const confirmDepot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { boutiqueId } = req.body; // Admin specifies which boutique they received from
    const adminId = req.user.id;
    const commande = await commandeService.confirmDepotReceipt(id, boutiqueId, adminId);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    const commande = await commandeService.cancelOrder(id, userId, role, reason);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const cancelItem = async (req, res, next) => {
  try {
    const { id, produitId } = req.params;
    const { boutiqueId, reason } = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    const finalBoutiqueId = role === 'boutique' ? req.user.boutiqueId : boutiqueId;
    const commande = await commandeService.cancelOrderItem(
      id,
      finalBoutiqueId,
      produitId,
      userId,
      role,
      reason,
    );
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

export const confirmFinal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;
    const commande = await commandeService.confirmFinalReceipt(id, userId, role);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};
