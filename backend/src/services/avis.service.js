import Avis from '../models/Avis.js';
import Commande from '../models/Commande.js';
import Produit from '../models/Produit.js';
import Boutique from '../models/Boutique.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { createNotification } from './notification.service.js';

class AvisService {
  /**
   * Vérifie si un client peut laisser un avis sur un produit.
   */
  async canReviewProduct(clientId, produitId) {
    const commande = await Commande.findOne({
      clientId,
      'boutiques.items.produitId': produitId,
      'boutiques.status': 'terminee',
    });
    return !!commande;
  }

  /**
   * Vérifie si un client peut laisser un avis sur une boutique.
   */
  async canReviewBoutique(clientId, boutiqueId) {
    const commande = await Commande.findOne({
      clientId,
      'boutiques.boutiqueId': boutiqueId,
      'boutiques.status': 'terminee',
    });
    return !!commande;
  }

  /**
   * Crée un nouvel avis.
   */
  async createAvis(data) {
    const { type, produitId, boutiqueId, clientId, note, titre, commentaire } = data;

    // Vérification de l'éligibilité
    if (type === 'produit') {
      const canReview = await this.canReviewProduct(clientId, produitId);
      if (!canReview) {
        const error = new Error(
          'Vous devez avoir acheté ce produit et reçu votre commande pour laisser un avis.',
        );
        error.status = 403;
        throw error;
      }
    } else {
      const canReview = await this.canReviewBoutique(clientId, boutiqueId);
      if (!canReview) {
        const error = new Error(
          'Vous devez avoir effectué au moins un achat dans cette boutique pour laisser un avis.',
        );
        error.status = 403;
        throw error;
      }
    }

    const avis = new Avis({
      type,
      produitId,
      boutiqueId,
      clientId,
      note,
      titre,
      commentaire,
    });

    const savedAvis = await avis.save();

    // Recalculer les notes
    await this.updateRatings(boutiqueId, produitId);

    // Notification à la boutique
    try {
      const boutiqueObj = await Boutique.findById(boutiqueId);
      if (boutiqueObj && boutiqueObj.userId) {
        const targetLabel = type === 'produit' ? 'un produit' : 'votre boutique';
        await createNotification({
          userId: boutiqueObj.userId,
          titre: 'Nouvel avis reçu',
          message: `Vous avez reçu un nouvel avis de ${note}/5 sur ${targetLabel}.`,
          type: 'avis',
          channel: 'app',
        });
      }
    } catch (e) {
      console.error('Error sending notification to boutique:', e);
    }

    return savedAvis;
  }

  /**
   * Met à jour les moyennes de notes pour un produit et une boutique.
   */
  async updateRatings(boutiqueId, produitId = null) {
    if (produitId) {
      // Calcul moyenne pour le produit (en excluant ceux masqués)
      const stats = await Avis.aggregate([
        {
          $match: {
            produitId: new mongoose.Types.ObjectId(produitId),
            type: 'produit',
            estMasque: { $ne: true },
          },
        },
        { $group: { _id: '$produitId', avgNote: { $avg: '$note' }, count: { $sum: 1 } } },
      ]);

      if (stats.length > 0) {
        await Produit.findByIdAndUpdate(produitId, {
          noteMoyenne: Math.floor(stats[0].avgNote),
          nombreAvis: stats[0].count,
        });
      } else {
        await Produit.findByIdAndUpdate(produitId, { noteMoyenne: 0, nombreAvis: 0 });
      }
    }

    // Calcul moyenne pour la boutique (en excluant ceux masqués)
    const avisBoutique = await Avis.find({
      boutiqueId,
      type: 'boutique',
      estMasque: { $ne: true },
    });
    const avisProduits = await Avis.find({ boutiqueId, type: 'produit', estMasque: { $ne: true } });

    const sumShop = avisBoutique.reduce((sum, a) => sum + a.note, 0);
    const sumProds = avisProduits.reduce((sum, a) => sum + a.note, 0);

    const countShop = avisBoutique.length;
    const countProds = avisProduits.length;

    const totalWeightedScore = sumShop * 1 + sumProds * 0.25;
    const totalWeightedCount = countShop * 1 + countProds * 0.25;

    let finalNote = 0;
    if (totalWeightedCount > 0) {
      finalNote = Math.floor(totalWeightedScore / totalWeightedCount);
    }

    await Boutique.findByIdAndUpdate(boutiqueId, {
      noteMoyenne: finalNote,
      nombreAvis: countShop, // On affiche souvent le nombre d'avis directs sur la boutique
    });
  }

  /**
   * Ajoute une réponse à un avis.
   */
  async addReponse(
    avisId,
    userId,
    role,
    message,
    prenomRepondant = '',
    nomBoutique = '',
    boutiqueIdUser = null,
  ) {
    const avis = await Avis.findById(avisId);
    if (!avis) throw new Error('Avis non trouvé.');

    if (role === 'boutique') {
      if (avis.boutiqueId.toString() !== boutiqueIdUser?.toString()) {
        const error = new Error('Seule la boutique concernée peut répondre.');
        error.status = 403;
        throw error;
      }
    }

    avis.reponses.push({
      message,
      userId,
      roleRepondant: role,
      boutiqueId: role === 'boutique' ? boutiqueIdUser : null,
      prenomRepondant,
      nomBoutique,
      dateReponse: new Date(),
    });

    const savedAvis = await avis.save();

    // Notification à l'auteur de l'avis
    try {
      const repondantLabel = role === 'boutique' ? nomBoutique : "L'administration";
      await createNotification({
        userId: avis.clientId,
        titre: 'Réponse à votre avis',
        message: `${repondantLabel} a répondu à votre avis sur ${avis.type === 'produit' ? 'un produit' : 'une boutique'}.`,
        type: 'avis',
        channel: 'app',
      });
    } catch (e) {
      console.error('Error sending response notification:', e);
    }

    return savedAvis;
  }

  /**
   * Signaler un avis.
   */
  async signalerAvis(avisId, userId, raison) {
    const avis = await Avis.findById(avisId).populate('produitId boutiqueId');
    if (!avis) throw new Error('Avis non trouvé.');

    avis.estSignale = true;
    avis.statutSignalement = 'en_attente';
    avis.signalements.push({ userId, raison, date: new Date() });

    const savedAvis = await avis.save();

    // 1. Notification à l'auteur de l'avis (Reporté)
    try {
      const target = avis.type === 'produit' ? avis.produitId?.titre : avis.boutiqueId?.nom;
      await createNotification({
        userId: avis.clientId,
        titre: 'Avis signalé',
        message: `Votre avis sur "${target}" a été signalé à l'administration.`,
        type: 'avis',
        channel: 'app',
      });
    } catch (e) {
      console.error('Error notifying avis author about signalement:', e);
    }

    // 2. Notification aux admins
    try {
      const admins = await User.find({ role: 'admin' });
      const targetId = avis.type === 'produit' ? avis.produitId?._id : avis.boutiqueId?._id;
      for (const admin of admins) {
        await createNotification({
          userId: admin._id,
          titre: 'Nouvel avis signalé',
          message: `Un avis sur "${avis.type}" (ID: ${targetId}) a été signalé pour la raison : ${raison}`,
          type: 'admin',
          channel: 'app',
        });
      }
    } catch (e) {
      console.error('Error notifying admins about signalement:', e);
    }

    return savedAvis;
  }

  /**
   * Gérer un signalement (Admin).
   */
  async handleSignalement(avisId, action) {
    const avis = await Avis.findById(avisId).populate('produitId boutiqueId');
    if (!avis) throw new Error('Avis non trouvé.');

    const initialReporters = avis.signalements.map((s) => s.userId);

    if (action === 'accepter') {
      avis.statutSignalement = 'valide';
      avis.estMasque = true; // On masque l'avis
      avis.estSignale = false; // Plus en attente
    } else if (action === 'rejeter') {
      avis.statutSignalement = 'rejete';
      avis.estSignale = false;
      avis.estMasque = false;
    }

    const savedAvis = await avis.save();
    // Recalculer les ratings car potentiellement masqué
    await this.updateRatings(avis.boutiqueId, avis.produitId);

    // 1. Notification aux rapporteurs (ceux qui ont signalé)
    try {
      const actionLabel = action === 'accepter' ? 'accepté' : 'rejeté';
      for (const reporterId of initialReporters) {
        await createNotification({
          userId: reporterId,
          titre: 'Suivi de signalement',
          message: `L'administration a ${actionLabel} le signalement de l'avis que vous avez signalé.`,
          type: 'avis',
          channel: 'app',
        });
      }
    } catch (e) {
      console.error('Error notifying reporters about admin action:', e);
    }

    // 2. Notification à l'auteur de l'avis si masqué
    if (action === 'accepter') {
      try {
        await createNotification({
          userId: avis.clientId,
          titre: 'Avis masqué',
          message: `Votre avis a été masqué par l'administration suite à plusieurs signalements.`,
          type: 'avis',
          channel: 'app',
        });
      } catch (e) {
        console.error('Error notifying author about masked avis:', e);
      }
    }

    return savedAvis;
  }

  /**
   * Récupérer les avis signalés.
   */
  async getSignaledAvis() {
    return await Avis.find({ estSignale: true })
      .populate('clientId', 'nom prenom')
      .populate('produitId', 'titre')
      .populate('boutiqueId', 'nom')
      .populate({
        path: 'signalements.userId',
        select: 'nom prenom role boutiqueId',
        populate: { path: 'boutiqueId', select: 'nom' },
      });
  }

  /**
   * Récupérer les avis d'un produit. (Non masqués)
   */
  async getAvisByProduit(produitId) {
    return await Avis.find({ produitId, type: 'produit', estMasque: { $ne: true } })
      .populate('clientId', 'nom prenom')
      .sort({ createdAt: -1 });
  }

  /**
   * Récupérer les avis d'une boutique. (Non masqués)
   */
  async getAvisByBoutique(boutiqueId) {
    return await Avis.find({ boutiqueId, type: 'boutique', estMasque: { $ne: true } })
      .populate('clientId', 'nom prenom')
      .sort({ createdAt: -1 });
  }
}

export default new AvisService();
