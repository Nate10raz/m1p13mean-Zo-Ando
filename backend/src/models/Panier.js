const mongoose = require('mongoose');

const panierSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  items: [
    {
      produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
      variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit' },
      boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
      quantite: { type: Number, required: true, min: 1 },
      prixId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prix', required: true },
      prixUnitaire: { type: Number, required: true, min: 0 },
      nomProduit: String,
      imageProduit: String,
    },
  ],

  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

panierSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Définir une expiration après 30 jours
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Panier', panierSchema);
