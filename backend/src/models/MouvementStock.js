import mongoose from 'mongoose';

const mouvementStockSchema = new mongoose.Schema({
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true, index: true },
  variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit' },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },

  type: {
    type: String,
    enum: ['ajout', 'retrait', 'commande', 'ajustement', 'retour', 'defectueux'],
    required: true,
  },

  quantite: { type: Number, required: true },
  stockAvant: { type: Number, required: true },
  stockApres: { type: Number, required: true },
  reference: String,
  commandeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raison: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('MouvementStock', mouvementStockSchema);
