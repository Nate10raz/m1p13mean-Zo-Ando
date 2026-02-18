import mongoose from 'mongoose';

const alerteStockSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true, index: true },
  variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit', default: null },
  seuil: { type: Number, required: true, min: 0 },
  estActif: { type: Boolean, default: true },
  dernierDeclenchement: Date,
  createdAt: { type: Date, default: Date.now },
});

alerteStockSchema.index({ boutiqueId: 1, produitId: 1, variationId: 1 }, { unique: true });

export default mongoose.model('AlerteStock', alerteStockSchema);
