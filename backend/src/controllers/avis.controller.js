import AvisService from '../services/avis.service.js';
import User from '../models/User.js';
import Boutique from '../models/Boutique.js';

/**
 * @openapi
 * tags:
 *   - name: Avis
 *     description: Gestion des avis, notes et signalements sur produits et boutiques
 */

/**
 * @openapi
 * /avis:
 *   post:
 *     tags: [Avis]
 *     summary: Soumettre un nouvel avis (Client)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, boutiqueId, note]
 *             properties:
 *               type: { type: string, enum: [produit, boutique], description: "Type d'entité notée" }
 *               produitId: { type: string, description: "ID du produit si type=produit" }
 *               boutiqueId: { type: string, description: "ID de la boutique" }
 *               note: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               titre: { type: string, example: "Excellent service" }
 *               commentaire: { type: string, example: "Livraison rapide et produit conforme." }
 *     responses:
 *       201: { description: Avis créé avec succès }
 */
export const createAvis = async (req, res, next) => {
  try {
    const { type, produitId, boutiqueId, note, titre, commentaire } = req.body;
    const clientId = req.user.id;

    if (!type || !boutiqueId || !note) {
      return res.status(400).json({ message: 'Type, boutiqueId et note sont requis.' });
    }

    if (type === 'produit' && !produitId) {
      return res.status(400).json({ message: 'produitId est requis for un avis produit.' });
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
 * @openapi
 * /avis/{avisId}/reponse:
 *   post:
 *     tags: [Avis]
 *     summary: Répondre à un avis existant (Boutique/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: avisId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: Réponse enregistrée }
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
 * @openapi
 * /avis/{avisId}/signalement:
 *   post:
 *     tags: [Avis]
 *     summary: Signaler un avis inapproprié
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: avisId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [raison]
 *             properties:
 *               raison: { type: string, example: "Commentaire offensant" }
 *     responses:
 *       200: { description: Signalement pris en compte }
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
 * @openapi
 * /avis/admin/signales:
 *   get:
 *     tags: [Avis]
 *     summary: Lister tous les avis signalés (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des avis en attente de modération }
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
 * @openapi
 * /avis/admin/{avisId}/signalement:
 *   patch:
 *     tags: [Avis]
 *     summary: Modérer un avis signalé (Accepter/Rejeter) (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: avisId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [accepter, rejeter], description: "accepter supprime l'avis, rejeter ignore le signalement" }
 *     responses:
 *       200: { description: Modération effectuée }
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
 * @openapi
 * /avis/{type}/{id}:
 *   get:
 *     tags: [Avis]
 *     summary: Consulter les avis publics d'une entité (Boutique/Produit)
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [produit, boutique] }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des avis validés }
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
