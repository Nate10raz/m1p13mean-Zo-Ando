import mongoose from 'mongoose';

const panierSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  items: [
    {
      produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
      variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit' },
      boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
      quantite: { type: Number, required: true, min: 1 },
      prixId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prix' }, // Optionnel pour le moment
      prixUnitaire: { type: Number, required: true, min: 0 },
      nomProduit: String,
      imageProduit: String,
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted'],
    default: 'active',
    index: true,
  },
  expiresAt: { type: Date },
});

panierSchema.pre('save', function () {
  this.updatedAt = Date.now();
  // Définir une expiration après 30 jours
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
});

export default mongoose.model('Panier', panierSchema);
