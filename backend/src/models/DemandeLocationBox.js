import mongoose from 'mongoose';

const demandeLocationBoxSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true, index: true },
  dateDebut: { type: Date, required: true },

  status: {
    type: String,
    enum: ['en_attente', 'validee', 'rejetee', 'annulee'],
    default: 'en_attente',
    index: true,
  },

  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateValidation: Date,
  motif: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

demandeLocationBoxSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('DemandeLocationBox', demandeLocationBoxSchema);
