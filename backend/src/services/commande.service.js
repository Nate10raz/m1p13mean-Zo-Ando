import mongoose from 'mongoose';
import Commande from '../models/Commande.js';
import Panier from '../models/Panier.js';
import Boutique from '../models/Boutique.js';
import Prix from '../models/Prix.js';
import User from '../models/User.js';
import { createNotification } from './notification.service.js';
import { getLatestFraisLivraison } from './boutique.service.js';

const createError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// HELPER: Send notification to all admins
const notifyAdmins = async (titre, message, data = {}) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await createNotification({
        userId: admin._id,
        type: 'admin_order_notification',
        titre,
        message,
        channel: 'all',
        data: { ...data, path: '/admin/orders' },
      });
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

// HELPER: Send notification to all users of a boutique
const notifyBoutiqueUsers = async (boutiqueId, titre, message, data = {}) => {
  try {
    const users = await User.find({ role: 'boutique', boutiqueId }).select('_id');
    for (const user of users) {
      await createNotification({
        userId: user._id,
        type: 'boutique_order_notification',
        titre,
        message,
        channel: 'all',
        data: { ...data, path: '/dashboard/boutique/orders' },
      });
    }
  } catch (error) {
    console.error('Error notifying boutique users:', error);
  }
};

// HELPER: Recalculate totals
const recalculateCommandeTotals = (commande) => {
  let newBaseTotal = 0;
  commande.boutiques.forEach((b) => {
    b.items.forEach((it) => {
      if (it.status !== 'annulee') {
        newBaseTotal += it.prixUnitaire * it.quantite;
      }
    });
  });

  commande.baseTotal = newBaseTotal;

  if (commande.fraisLivraison) {
    if (commande.fraisLivraison.type === 'pourcentage') {
      commande.fraisLivraison.montant = (newBaseTotal * commande.fraisLivraison.valeur) / 100;
    }
    // Fixed fees remain the same unless baseTotal is 0
    if (newBaseTotal === 0) {
      commande.fraisLivraison.montant = 0;
    }
  }

  commande.total = newBaseTotal + (commande.fraisLivraison?.montant || 0);
};

export const createCommande = async (userId, deliveryData) => {
  const { typedelivery, adresseLivraison, paiementMethode, note, dateDeliveryOrAbleCollect } =
    deliveryData;

  // 1. Get User's Cart
  const panier = await Panier.findOne({ clientId: userId });
  if (!panier || panier.items.length === 0) {
    throw createError('Votre panier est vide', 400);
  }

  // 2. Identify Boutiques involved
  const boutiqueIds = [...new Set(panier.items.map((item) => item.boutiqueId.toString()))];
  const boutiques = await Boutique.find({ _id: { $in: boutiqueIds } });

  // 3. Validation rule for 'livraison_boutique' and Jour J
  const requestedDate = new Date(dateDeliveryOrAbleCollect);
  const today = new Date();
  const isJourJ =
    requestedDate.getFullYear() === today.getFullYear() &&
    requestedDate.getMonth() === today.getMonth() &&
    requestedDate.getDate() === today.getDate();

  if (isJourJ && typedelivery !== 'livraison_boutique') {
    throw createError(
      "La livraison au Jour J n'est possible que pour la livraison directe par boutique.",
      400,
    );
  }

  if (typedelivery === 'livraison_boutique') {
    if (boutiqueIds.length > 1) {
      throw createError(
        "La livraison par boutique n'est possible que si tous les produits proviennent de la même boutique.",
        400,
      );
    }
    const boutique = boutiques[0];
    if (!boutique.livraisonStatus) {
      throw createError(`La boutique ${boutique.nom} ne propose pas de livraison à domicile.`, 400);
    }
    if (isJourJ && !boutique.accepteLivraisonJourJ) {
      throw createError(`La boutique ${boutique.nom} n'accepte pas la livraison au Jour J.`, 400);
    }
  }

  // 4. Calculate Costs
  let baseTotal = 0;
  panier.items.forEach((item) => {
    baseTotal += item.prixUnitaire * item.quantite;
  });

  let feeData = { montant: 0, valeur: 0, type: 'fixe' };

  if (typedelivery === 'livraison_supermarche') {
    const feeRecord = await getLatestFraisLivraison(null);
    if (feeRecord) {
      feeData.type = feeRecord.type || 'fixe';
      feeData.valeur = feeRecord.montant;
      if (feeData.type === 'pourcentage') {
        feeData.montant = (baseTotal * feeData.valeur) / 100;
      } else {
        feeData.montant = feeData.valeur;
      }
    } else {
      feeData.montant = 5000; // Default fallback
      feeData.valeur = 5000;
    }
  } else if (typedelivery === 'livraison_boutique') {
    const boutique = boutiques[0];
    const feeRecord = await getLatestFraisLivraison(boutique._id);
    if (feeRecord) {
      feeData.type = feeRecord.type || 'fixe';
      feeData.valeur = feeRecord.montant;
      if (feeData.type === 'pourcentage') {
        feeData.montant = (baseTotal * feeData.valeur) / 100;
      } else {
        feeData.montant = feeData.valeur;
      }
    }
  }

  const total = baseTotal + feeData.montant;

  // 5. Structure boutiques for the Commande model
  const boutiquesData = await Promise.all(
    boutiqueIds.map(async (bId) => {
      const boutiqueInfo = boutiques.find((b) => b._id.toString() === bId);

      const itemsInBoutique = await Promise.all(
        panier.items
          .filter((item) => item.boutiqueId.toString() === bId)
          .map(async (item) => {
            let prixId = item.prixId;
            if (!prixId) {
              const query = { estActif: true, boutiqueId: item.boutiqueId };
              if (item.variationId) query.variationId = item.variationId;
              else {
                query.produitId = item.produitId;
                query.variationId = { $exists: false };
              }
              const activePrix = await Prix.findOne(query).select('_id').lean();
              prixId = activePrix?._id;
            }

            return {
              produitId: item.produitId,
              variationId: item.variationId,
              boutiqueId: item.boutiqueId,
              prixId: prixId,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
              nomProduit: item.nomProduit,
              imageProduit: item.imageProduit,
            };
          }),
      );

      return {
        name: boutiqueInfo.nom,
        boutiqueId: bId,
        items: itemsInBoutique,
        status: 'en_attente_validation',
      };
    }),
  );

  // 6. Create Commande
  const user = await User.findById(userId).select('nom prenom email telephone');
  const newCommande = new Commande({
    clientId: userId,
    clientInfo: {
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
    },
    typedelivery,
    dateDeliveryOrAbleCollect,
    adresseLivraison: typedelivery !== 'collect' ? adresseLivraison : 'Retrait en entrepôt',
    paiement: {
      methode: paiementMethode || 'especes',
      statut: 'non_paye',
      montantPaye: 0,
    },
    boutiques: boutiquesData,
    baseTotal,
    fraisLivraison: feeData,
    total,
    notes: note,
    statusLivraison: 'en_attente_validation',
  });

  await newCommande.save();

  // 7. Clear Panier
  await Panier.deleteOne({ clientId: userId });

  // Notifications
  // Client
  await createNotification({
    userId: userId,
    type: 'commande_creee',
    titre: `📦 Commande #${newCommande.numeroCommande} reçue`,
    message: `Votre commande ${newCommande.numeroCommande} est enregistrée. Elle attend d'être acceptée par les boutiques.`,
    channel: 'all',
  });

  // Boutiques & Admins
  for (const bId of boutiqueIds) {
    await notifyBoutiqueUsers(
      bId,
      `🔔 Nouvelle Commande #${newCommande.numeroCommande}`,
      `Une nouvelle commande ${newCommande.numeroCommande} nécessite votre attention.`,
      { commandeId: newCommande._id },
    );
  }
  await notifyAdmins(
    `🆕 Commande #${newCommande.numeroCommande} passée`,
    `Une nouvelle commande ${newCommande.numeroCommande} a été passée par un client.`,
    { commandeId: newCommande._id },
  );

  return newCommande;
};

export const getClientCommandes = async (userId) => {
  return await Commande.find({ clientId: userId }).sort({ createdAt: -1 });
};

export const getBoutiqueCommandes = async (boutiqueId) => {
  if (!boutiqueId) return [];
  const id = new mongoose.Types.ObjectId(boutiqueId);
  return await Commande.find({ 'boutiques.boutiqueId': id }).sort({ createdAt: -1 });
};

export const getAllCommandes = async () => {
  return await Commande.find().sort({ createdAt: -1 }).populate('clientId', 'nom prenom email');
};

export const getCommandeById = async (commandeId, userId, role) => {
  const commande = await Commande.findById(commandeId).populate(
    'clientId',
    'nom prenom email telephone',
  );
  if (!commande) throw createError('Commande introuvable', 404);

  if (role !== 'admin') {
    if (role === 'client' && commande.clientId?._id.toString() !== userId.toString()) {
      throw createError('Accès refusé', 403);
    }
    if (role === 'boutique') {
      const user = await User.findById(userId);
      const isBoutiqueInOrder = commande.boutiques.some(
        (b) => b.boutiqueId.toString() === user.boutiqueId?.toString(),
      );
      if (!isBoutiqueInOrder) throw createError('Accès refusé', 403);
    }
  }

  // Add clientInfo for frontend convenience
  const commandeObj = commande.toObject();
  commandeObj.clientInfo = commandeObj.clientId;

  return commandeObj;
};

// 1. Accept Order (Boutique)
export const acceptBoutiqueOrder = async (commandeId, boutiqueId) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  const bIndex = commande.boutiques.findIndex(
    (b) => b.boutiqueId.toString() === boutiqueId.toString(),
  );
  if (bIndex === -1) throw createError('Boutique non concernée par cette commande', 403);

  commande.boutiques[bIndex].estAccepte = true;
  commande.boutiques[bIndex].dateAcceptation = new Date();
  commande.boutiques[bIndex].status = 'en_preparation';

  // If all active boutiques accepted, main status becomes en_preparation
  const allAccepted = commande.boutiques.every((b) => b.estAccepte || b.status === 'annulee');
  if (allAccepted) {
    commande.statusLivraison = 'en_preparation';
  }

  await commande.save();

  // Notify Client
  await createNotification({
    userId: commande.clientId,
    type: 'order_accepted',
    titre: `✅ Lot accepté - #${commande.numeroCommande}`,
    message: `La boutique ${commande.boutiques[bIndex].name} a accepté votre lot.`,
    channel: 'all',
  });

  return commande;
};

// 1b. Boutique Start Delivery (for DIRECT Delivery)
export const startBoutiqueDelivery = async (commandeId, boutiqueId) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  if (!['boutique', 'livraison_boutique', 'livraison_directe'].includes(commande.typedelivery)) {
    throw createError('Action réservée à la livraison directe boutique', 400);
  }

  const bIndex = commande.boutiques.findIndex(
    (b) => b.boutiqueId.toString() === boutiqueId.toString(),
  );
  if (bIndex === -1) throw createError('Boutique non concernée', 403);

  commande.boutiques[bIndex].status = 'en_livraison';
  commande.statusLivraison = 'en_livraison';

  await commande.save();

  await createNotification({
    userId: commande.clientId,
    type: 'order_in_delivery',
    titre: `🚚 Commande #${commande.numeroCommande} en cours de livraison`,
    message: `Votre lot est maintenant en cours de livraison par la boutique ${commande.boutiques[bIndex].name}.`,
    channel: 'all',
  });

  return commande;
};

// 3. Admin Confirm Depot Receipt
export const confirmDepotReceipt = async (commandeId, boutiqueId, adminId) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  const bIndex = commande.boutiques.findIndex(
    (b) => b.boutiqueId.toString() === boutiqueId.toString(),
  );
  if (bIndex === -1) throw createError('Boutique non concernée', 403);

  commande.boutiques[bIndex].depotEntrepot.estFait = true;
  commande.boutiques[bIndex].depotEntrepot.adminId = adminId;
  commande.boutiques[bIndex].depotEntrepot.dateValidation = new Date();

  // After Admin reception at depot, Boutique status reflects this
  if (commande.typedelivery === 'collect') {
    commande.boutiques[bIndex].status = 'peut_etre_collecte';
  } else if (commande.typedelivery === 'livraison_supermarche') {
    commande.boutiques[bIndex].status = 'en_livraison';
  }

  // Check if all active boutiques arrived at depot
  const allArrived = commande.boutiques.every(
    (b) => b.depotEntrepot.dateValidation || b.status === 'annulee',
  );

  if (allArrived) {
    if (commande.typedelivery === 'collect') {
      commande.statusLivraison = 'peut_etre_collecte';
      await createNotification({
        userId: commande.clientId,
        type: 'order_ready_collect',
        titre: `🏁 Commande prète au dépôt`,
        message: `Votre commande #${commande.numeroCommande} est prête à être récupérée au dépôt.`,
        channel: 'all',
      });
    } else if (commande.typedelivery === 'livraison_supermarche') {
      commande.statusLivraison = 'en_livraison';
      await createNotification({
        userId: commande.clientId,
        type: 'order_in_delivery',
        titre: `🚚 Commande en livraison`,
        message: `Tous les articles de votre commande #${commande.numeroCommande} sont arrivés au dépôt et sont maintenant en cours de livraison.`,
        channel: 'all',
      });
    }
  }

  await commande.save();
  return commande;
};

// 4. Admin Marks as Shipped for Delivery (for livraison_supermarche)
export const adminMarkAsShipped = async (commandeId, adminId) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  if (commande.typedelivery !== 'livraison_supermarche') {
    throw createError('Seulement pour la livraison supermarché', 400);
  }

  // No status change to 'livree', it stays 'en_livraison' until CLIENT confirms
  commande.validationLivraison.dateLivraison = new Date();
  commande.validationLivraison.validateurId = adminId;

  await commande.save();

  await createNotification({
    userId: commande.clientId,
    type: 'order_shipped_admin',
    titre: `📦 Livraison en cours`,
    message: `Votre commande #${commande.numeroCommande} a quitté le dépôt. Veuillez confirmer dès réception.`,
    channel: 'all',
  });

  return commande;
};

// 4. Cancel Command (Whole or Lot)
export const cancelOrder = async (commandeId, userId, role, reason) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  let participantsToNotify = [];

  if (role === 'admin') {
    // Admin cancels EVERYTHING
    commande.statusLivraison = 'annulee';
    commande.boutiques.forEach((b) => {
      b.status = 'annulee';
      b.items.forEach((it) => (it.status = 'annulee'));
    });
    participantsToNotify = [commande.clientId, ...commande.boutiques.map((b) => b.boutiqueId)];
  } else if (role === 'boutique') {
    const user = await User.findById(userId);
    const bId = user.boutiqueId;
    const targetB = commande.boutiques.find((b) => b.boutiqueId.toString() === bId?.toString());
    if (!targetB) throw createError('Boutique non concernée', 403);

    if (targetB.depotEntrepot?.dateValidation) {
      throw createError('Votre lot est déjà validé et ne peut plus être annulé.', 400);
    }

    commande.statusLivraison = 'annulee';
    commande.boutiques.forEach((b) => {
      b.status = 'annulee';
      b.items.forEach((it) => (it.status = 'annulee'));
    });

    participantsToNotify = [commande.clientId, ...commande.boutiques.map((b) => b.boutiqueId)];
  } else if (role === 'client') {
    // Client cancels WHOLE ORDER
    if (commande.clientId.toString() !== userId.toString()) throw createError('Non autorisé', 403);

    const anyValidated = commande.boutiques.some((b) => b.depotEntrepot?.dateValidation);
    if (anyValidated)
      throw createError(
        'Certains articles sont déjà en cours de livraison et ne peuvent plus être annulés.',
        400,
      );

    commande.statusLivraison = 'annulee';
    commande.boutiques.forEach((b) => {
      b.status = 'annulee';
      b.items.forEach((it) => (it.status = 'annulee'));
    });
    participantsToNotify = [...commande.boutiques.map((b) => b.boutiqueId)];
  }

  commande.notes = (commande.notes || '') + `\nAnnulation (${role}): ${reason}`;
  await commande.save();

  // Notify relevant parties
  for (const pId of participantsToNotify) {
    if (!pId || pId.toString() === userId.toString()) continue;
    await createNotification({
      userId: pId,
      type: 'order_cancelled',
      titre: `❌ Commande #${commande.numeroCommande} annulée`,
      message: `La commande ${commande.numeroCommande} a été annulée (${role === 'boutique' ? 'partiellement' : 'totalement'}). Motif: ${reason}`,
      channel: 'all',
    });
  }

  return commande;
};

export const cancelOrderItem = async (commandeId, boutiqueId, produitId, userId, role, reason) => {
  if (role === 'admin') {
    throw createError(
      "Un administrateur ne peut qu'annuler toute la commande, pas des articles spécifiques.",
      403,
    );
  }

  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  const boutique = commande.boutiques.find(
    (b) => b.boutiqueId.toString() === boutiqueId.toString(),
  );
  if (!boutique) throw createError('Boutique non concernée', 403);

  // Permission Check: Only before depot is validated
  if (boutique.depotEntrepot?.dateValidation) {
    throw createError(
      "La commande est déjà confirmée à l'entrepôt et ne peut plus être modifiée.",
      400,
    );
  }

  // Identify Item (consider potential variationId too if possible, but for now produitId)
  const item = boutique.items.find(
    (i) => i.produitId.toString() === produitId.toString() && i.status !== 'annulee',
  );
  if (!item) throw createError('Article introuvable ou déjà annulé', 404);

  // ONLY the customer who made the order OR the boutique itself can cancel an item
  if (role === 'client' && commande.clientId.toString() !== userId.toString()) {
    throw createError('Non autorisé', 403);
  }
  // (Boutique check is already handled by boutiqueId parameter passed from the controller which uses req.user.boutiqueId if role === 'boutique')

  // Mark item as cancelled
  item.status = 'annulee';
  commande.notes =
    (commande.notes || '') + `\nAnnulation article [${item.nomProduit}] par ${role}: ${reason}`;

  // Recalculate Totals
  recalculateCommandeTotals(commande);

  // If an item is cancelled, the whole order matches the "article non accepté" rule
  commande.statusLivraison = 'annulee';
  commande.boutiques.forEach((b) => {
    b.status = 'annulee';
    b.items.forEach((it) => {
      it.status = 'annulee';
    });
  });

  await commande.save();

  await createNotification({
    userId: commande.clientId,
    type: 'order_item_cancelled',
    titre: `⚠️ Article retiré - #${commande.numeroCommande}`,
    message: `L'article "${item.nomProduit}" a été retiré de votre commande ${commande.numeroCommande}.`,
    channel: 'all',
  });

  return commande;
};

// 5. Final Confirmation
export const confirmFinalReceipt = async (commandeId, userId, role) => {
  const commande = await Commande.findById(commandeId);
  if (!commande) throw createError('Commande introuvable', 404);

  if (commande.typedelivery === 'collect') {
    commande.validationCollection.estCollecte = true;
    commande.validationCollection.dateCollection = new Date();
    commande.validationCollection.dateValidation = new Date();
  } else {
    commande.validationLivraison.estLivre = true;
    commande.validationLivraison.dateLivraison = new Date();
    commande.validationLivraison.dateValidation = new Date();
    commande.validationLivraison.validateurId = userId;
  }

  commande.statusLivraison = 'terminee';
  // Update all shop statuses to terminee if the main order is finished
  commande.boutiques.forEach((b) => {
    if (b.status !== 'annulee') b.status = 'terminee';
  });

  commande.paiement.statut = 'paye';
  commande.paiement.datePaiement = new Date();
  commande.paiement.montantPaye = commande.total;

  await commande.save();

  await notifyAdmins(
    'Commande terminée',
    `La commande ${commande.numeroCommande} a été confirmée comme reçue par le client.`,
    { commandeId: commande._id },
  );

  return commande;
};
