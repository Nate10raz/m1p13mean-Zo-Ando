import mongoose from 'mongoose';

const avisSchema = new mongoose.Schema({
  produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true, index: true },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  commandeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Commande', required: true },
  note: { type: Number, min: 1, max: 5, required: true },
  commentaire: String,
  titre: String,

  reponse: {
    message: String,
    dateReponse: Date,
  },

  estApprouve: { type: Boolean, default: false },
  estSignale: { type: Boolean, default: false },

  signalements: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      raison: String,
      date: Date,
    },
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

avisSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('Avis', avisSchema);
