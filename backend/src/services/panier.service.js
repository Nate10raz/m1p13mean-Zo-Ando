import Panier from '../models/Panier.js';
import Produit from '../models/Produit.js';
import VariationProduit from '../models/VariationProduit.js';
import Prix from '../models/Prix.js';
import mongoose from 'mongoose';

const createError = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

export const getPanier = async (clientId) => {
  let panier = await Panier.findOneAndUpdate(
    { clientId },
    { $setOnInsert: { items: [], createdAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .populate('items.produitId', 'titre images prixBaseActuel estActif stock')
    .populate('items.boutiqueId', 'nom isActive manualSwitchOpen');

  return panier;
};

export const addToPanier = async (clientId, { produitId, variationId, quantite = 1 }) => {
  const panier = await getPanier(clientId);

  const produit = await Produit.findById(produitId).populate('boutiqueId').lean();
  if (!produit) throw createError('Produit introuvable', 404);
  if (!produit.estActif) throw createError("Ce produit n'est plus disponible", 400);

  let prixUnitaire = produit.prixBaseActuel;
  let nomProduit = produit.titre;
  let imageProduit =
    (produit.images && produit.images.find((img) => img.isMain)?.url) ||
    (produit.images && produit.images[0]?.url);

  // Get active price ID for history tracking
  const activePrice = await Prix.findOne({
    produitId: variationId ? undefined : produitId,
    variationId: variationId || undefined,
    estActif: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  const prixId = activePrice ? activePrice._id : undefined;

  if (variationId) {
    const variation = await VariationProduit.findById(variationId).lean();
    if (!variation) throw createError('Variation introuvable', 404);
    if (!variation.isActive) throw createError("Cette variation n'est plus disponible", 400);
  }

  // Check if item already in cart
  const itemIndex = panier.items.findIndex(
    (item) =>
      item.produitId.toString() === produitId.toString() &&
      (variationId ? item.variationId?.toString() === variationId.toString() : !item.variationId),
  );

  if (itemIndex > -1) {
    panier.items[itemIndex].quantite += quantite;
    panier.items[itemIndex].prixUnitaire = prixUnitaire;
    panier.items[itemIndex].prixId = prixId;
  } else {
    panier.items.push({
      produitId,
      variationId,
      boutiqueId: produit.boutiqueId._id || produit.boutiqueId,
      quantite,
      prixUnitaire,
      prixId,
      nomProduit,
      imageProduit,
    });
  }

  await panier.save();
  return getPanier(clientId);
};

export const updateItemQuantity = async (clientId, { produitId, variationId, quantite }) => {
  const panier = await Panier.findOne({ clientId });
  if (!panier) throw createError('Panier introuvable', 404);

  const itemIndex = panier.items.findIndex(
    (item) =>
      item.produitId.toString() === produitId.toString() &&
      (variationId ? item.variationId?.toString() === variationId.toString() : !item.variationId),
  );

  if (itemIndex === -1) throw createError('Article introuvable dans le panier', 404);

  if (quantite <= 0) {
    panier.items.splice(itemIndex, 1);
  } else {
    panier.items[itemIndex].quantite = quantite;
  }

  await panier.save();
  return getPanier(clientId);
};

export const removeItem = async (clientId, { produitId, variationId }) => {
  const panier = await Panier.findOne({ clientId });
  if (!panier) throw createError('Panier introuvable', 404);

  panier.items = panier.items.filter(
    (item) =>
      !(
        item.produitId.toString() === produitId.toString() &&
        (variationId ? item.variationId?.toString() === variationId.toString() : !item.variationId)
      ),
  );

  await panier.save();
  return getPanier(clientId);
};

export const clearPanier = async (clientId) => {
  const panier = await Panier.findOne({ clientId });
  if (panier) {
    panier.items = [];
    await panier.save();
  }
  return panier;
};
