import mongoose from 'mongoose';

const prixSchema = new mongoose.Schema({
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', index: true },
  variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit', index: true },

  valeur: { type: Number, required: true, min: 0 },
  dateDebut: { type: Date, required: true },
  dateFin: Date,
  estActif: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

prixSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Validation : produitId ou variationId doit être présent
prixSchema.pre('validate', function (next) {
  if (!this.produitId && !this.variationId) {
    next(new Error('Soit produitId, soit variationId doit être fourni'));
  } else {
  }
});

export default mongoose.model('Prix', prixSchema);
