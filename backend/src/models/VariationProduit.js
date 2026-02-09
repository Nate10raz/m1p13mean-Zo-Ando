import mongoose from 'mongoose';

const variationProduitSchema = new mongoose.Schema({
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true, index: true },
  sku: { type: String, unique: true, sparse: true },

  combinaison: [
    {
      attribut: String,
      valeur: String,
    },
  ],

  prixBaseActuel: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  images: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

variationProduitSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('VariationProduit', variationProduitSchema);
