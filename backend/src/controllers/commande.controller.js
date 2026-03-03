import * as commandeService from '../services/commande.service.js';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';

/**
 * @openapi
 * tags:
 *   - name: Commandes
 *     description: Cycle de vie des commandes (Création, Expédition, Livraison, Annulation)
 */

/**
 * @openapi
 * /commandes:
 *   post:
 *     tags: [Commandes]
 *     summary: Créer une commande groupée (Client)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, totalAmount, deliveryAddress, phoneNumber, boutiqueIds]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [produitId, quantite, prixUnitaire]
 *                   properties:
 *                     produitId: { type: string }
 *                     variationId: { type: string }
 *                     quantite: { type: integer, example: 1 }
 *                     prixUnitaire: { type: number }
 *               totalAmount: { type: number, description: "Prix total incluant frais" }
 *               deliveryAddress: { type: string }
 *               phoneNumber: { type: string }
 *               boutiqueIds: { type: array, items: { type: string }, description: "Liste des boutiques impliquées" }
 *               fraisLivraison: { type: number }
 *               modePaiement: { type: string, enum: [cash, mobile_money], default: cash }
 *     responses:
 *       201: { description: Commande enregistrée avec succès }
 */
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

/**
 * @openapi
 * /commandes/my:
 *   get:
 *     tags: [Commandes]
 *     summary: Récupérer l'historique des commandes (Client)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste chronologique des commandes du client }
 */
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

/**
 * @openapi
 * /commandes/boutique/all:
 *   get:
 *     tags: [Commandes]
 *     summary: Voir les commandes reçues par ma boutique (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des commandes concernant les produits de la boutique }
 */
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

/**
 * @openapi
 * /commandes/admin/all:
 *   get:
 *     tags: [Commandes]
 *     summary: Tableau de bord de toutes les commandes mondiales (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste complète des commandes }
 */
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

/**
 * @openapi
 * /commandes/{id}:
 *   get:
 *     tags: [Commandes]
 *     summary: Consulter le détail d'une commande spécifique
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails incluant tracking, produits et adresses }
 */
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

/**
 * @openapi
 * /commandes/boutique/accept/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Confirmer la prise en charge d'une commande (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Commande acceptée et stock réservé }
 */
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

    const commande = await commandeService.acceptBoutiqueOrder(id, boutiqueId, req.user.id);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /commandes/boutique/start-delivery/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Initier la livraison vers le point de collecte (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Statut mis à jour vers "En route" }
 */
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

/**
 * @openapi
 * /commandes/admin/confirm-depot/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Confirmer la réception des produits au centre de tri (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boutiqueId]
 *             properties:
 *               boutiqueId: { type: string, description: "ID de la boutique qui a déposé le colis" }
 *     responses:
 *       200: { description: Passage enregistré au point relais central }
 */
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

/**
 * @openapi
 * /commandes/admin/mark-delivered/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Marquer la commande comme remise au client final (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Commande clôturée avec succès }
 */
export const markAsDelivered = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const commande = await commandeService.adminMarkAsShipped(id, adminId);
    res.status(200).json({ success: true, data: commande });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /commandes/cancel/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Annuler intégralement une commande
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: "Produit hors stock ou changement d'avis" }
 *     responses:
 *       200: { description: Commande annulée }
 */
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

/**
 * @openapi
 * /commandes/cancel-item/{id}/{produitId}:
 *   post:
 *     tags: [Commandes]
 *     summary: Annuler une ligne spécifique d'une commande
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               boutiqueId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Item annulé et remboursé si nécessaire }
 */
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

/**
 * @openapi
 * /commandes/confirm-receipt/{id}:
 *   post:
 *     tags: [Commandes]
 *     summary: Valider la réception conforme par le client final
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Statut finalisé }
 */
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
