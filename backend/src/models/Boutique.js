import mongoose from 'mongoose';

const boutiqueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  nom: { type: String, unique: true, required: true, index: true },
  description: String,
  logo: String,
  banner: String,
  adresse: String,
  boxIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Box' }],
    default: [],
  },

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
  manualSwitchOpen: { type: Boolean, default: true },
  dateValidation: Date,
  motifSuspension: String,
  noteMoyenne: { type: Number, min: 0, max: 5, default: 0 },
  nombreAvis: { type: Number, default: 0 },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  livraisonStatus: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

boutiqueSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Unique only when boxIds has values (allows multiple empty arrays)
boutiqueSchema.index(
  { boxIds: 1 },
  { unique: true, partialFilterExpression: { boxIds: { $type: 'array', $ne: [] } } },
);
// Ensure virtuals are included in toJSON and toObject
boutiqueSchema.set('toJSON', { virtuals: true });
boutiqueSchema.set('toObject', { virtuals: true });

// Virtual to calculate if the boutique is actually open (operational) right now
boutiqueSchema.virtual('isOpen').get(function () {
  // 1. Priority: Manual Switch (Owner controlled)
  if (!this.manualSwitchOpen) return false;

  const now = new Date();

  // 2. Priority: Regular Hours
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const currentDay = days[now.getDay()];
  const currentTimeNum = now.getHours() * 100 + now.getMinutes();

  const dayHoraires = (this.horaires || []).filter((h) => h.jour === currentDay);
  if (dayHoraires.length === 0) return false;

  return dayHoraires.some((h) => {
    const [hOpen, mOpen] = h.ouverture.split(':').map(Number);
    const [hClose, mClose] = h.fermeture.split(':').map(Number);
    const openNum = hOpen * 100 + mOpen;
    const closeNum = hClose * 100 + mClose;
    return currentTimeNum >= openNum && currentTimeNum <= closeNum;
  });
});

boutiqueSchema.virtual('statusReason').get(function () {
  if (!this.isActive) return "Boutique suspendue par l'administration";
  if (!this.manualSwitchOpen) return 'Boutique fermée manuellement par le propriétaire';

  const now = new Date();

  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const currentDay = days[now.getDay()];

  const dayHoraires = (this.horaires || []).filter((h) => h.jour === currentDay);
  if (dayHoraires.length === 0) return "Fermé aujourd'hui";

  const currentTimeNum = now.getHours() * 100 + now.getMinutes();
  const isCurrentlyOpen = dayHoraires.some((h) => {
    const [hOpen, mOpen] = h.ouverture.split(':').map(Number);
    const [hClose, mClose] = h.fermeture.split(':').map(Number);
    const openNum = hOpen * 100 + mOpen;
    const closeNum = hClose * 100 + mClose;
    return currentTimeNum >= openNum && currentTimeNum <= closeNum;
  });

  if (!isCurrentlyOpen) {
    // Check if it's before the first opening or after the last closing
    const sorted = [...dayHoraires].sort((a, b) => a.ouverture.localeCompare(b.ouverture));
    const nextToday = sorted.find((h) => {
      const [hO, mO] = h.ouverture.split(':').map(Number);
      return hO * 100 + mO > currentTimeNum;
    });

    if (nextToday) return `Ouvre à ${nextToday.ouverture}`;
    return "Fermé pour aujourd'hui";
  }

  return null;
});

export default mongoose.model('Boutique', boutiqueSchema);
