const mongoose = require('mongoose');

const fraisLivraisonSchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', index: true },
  min: { type: Number, required: true, default: 0 },
  max: { type: Number, required: true, default: -1 },
  montant: { type: Number, required: true, min: 0 },

  type: {
    type: String,
    enum: ['fixe', 'pourcentage'],
    default: 'fixe',
  },

  dateDebut: { type: Date, required: true, default: Date.now },
  dateFin: Date,
  estActif: { type: Boolean, default: true, index: true },
  description: String,
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

fraisLivraisonSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FraisLivraison', fraisLivraisonSchema);
