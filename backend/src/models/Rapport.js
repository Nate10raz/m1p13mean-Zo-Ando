const mongoose = require('mongoose');

const rapportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ventes', 'produits', 'clients', 'stocks', 'boutiques'],
    required: true,
  },

  periode: {
    debut: { type: Date, required: true },
    fin: { type: Date, required: true },
  },

  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' },
  categorieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  donnees: mongoose.Schema.Types.Mixed,
  format: { type: String, enum: ['csv', 'pdf'], default: 'csv' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  urlFichier: String,
  taille: Number,
  createdAt: { type: Date, default: Date.now },
  termineAt: Date,
});

module.exports = mongoose.model('Rapport', rapportSchema);
