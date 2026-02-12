import mongoose from 'mongoose';

const boutiqueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  nom: { type: String, unique: true, required: true, index: true },
  description: String,
  logo: String,
  banner: String,
  adresse: String,
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Box' },

  horaires: [
    {
      jour: {
        type: String,
        enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
      },
      ouverture: String,
      fermeture: String,
    },
  ],

  clickCollectActif: { type: Boolean, default: false },
  telephone: String,
  email: String,

  plage_livraison_boutique: [
    {
      jour: {
        type: String,
        enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
      },
      ouverture: String,
      fermeture: String,
      maxLivraison: Number,
    },
  ],

  status: {
    type: String,
    enum: ['en_attente', 'active', 'suspendue', 'rejetee'],
    default: 'en_attente',
    index: true,
  },

  statusLivreur: {
    type: String,
    enum: ['aucun', 'active', 'occupe'],
    default: 'aucun',
    index: true,
  },

  accepteLivraisonJourJ: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  dateValidation: Date,
  motifSuspension: String,
  noteMoyenne: { type: Number, min: 0, max: 5, default: 0 },
  nombreAvis: { type: Number, default: 0 },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

boutiqueSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Unique only when boxId is present (allows multiple nulls)
boutiqueSchema.index(
  { boxId: 1 },
  { unique: true, partialFilterExpression: { boxId: { $exists: true, $ne: null } } },
);

export default mongoose.model('Boutique', boutiqueSchema);
