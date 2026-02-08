const mongoose = require('mongoose');

const boxSchema = new mongoose.Schema({
  numero: { type: String, unique: true, required: true, index: true },
  etage: { type: Number, required: true },
  zone: { type: String, required: true, index: true },
  allee: String,
  position: String,
  description: String,

  caracteristiques: [
    {
      nom: String,
      valeur: String,
    },
  ],

  photos: [String],
  superficie: { type: Number, required: true },

  tarifActuel: {
    montant: Number,
    unite: { type: String, enum: ['mois', 'annee'] },
    dateDebut: Date,
  },

  estOccupe: { type: Boolean, default: false },
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' },

  contrat: {
    dateDebut: Date,
    dateFin: Date,
    reference: String,
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

boxSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Box', boxSchema);
