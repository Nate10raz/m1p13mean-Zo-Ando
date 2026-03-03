import mongoose from 'mongoose';

const avisSchema = new mongoose.Schema({
  type: { type: String, enum: ['produit', 'boutique'], required: true, index: true },
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', index: true }, // Requis si type 'produit'
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  note: { type: Number, min: 1, max: 5, required: true },
  commentaire: String,
  titre: String,
  estMasque: { type: Boolean, default: false },

  reponses: [
    {
      message: String,
      dateReponse: { type: Date, default: Date.now },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' }, // Si réponse d'une boutique
      roleRepondant: { type: String, enum: ['admin', 'boutique'] },
      prenomRepondant: String, // Pour "Prenom de Boutique"
      nomBoutique: String,
    },
  ],

  estSignale: { type: Boolean, default: false },
  statutSignalement: {
    type: String,
    enum: ['aucun', 'en_attente', 'valide', 'rejete'],
    default: 'aucun',
  },

  signalements: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      raison: String,
      date: { type: Date, default: Date.now },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

avisSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('Avis', avisSchema);
