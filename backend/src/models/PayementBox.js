import mongoose from 'mongoose';

const payementBoxSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true, index: true },
  prixBoxeId: { type: mongoose.Schema.Types.ObjectId, ref: 'HistoriquePrixBox', index: true },
  reference: { type: String, required: true, unique: true, index: true },
  periode: { type: String, required: true, index: true },
  montant: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date, index: true },
  status: {
    type: String,
    enum: ['en_attente', 'valide', 'rejete'],
    default: 'en_attente',
    index: true,
  },
  dateValidation: Date,
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commentaire: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

payementBoxSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

payementBoxSchema.index({ boutiqueId: 1, boxId: 1, periode: 1 }, { unique: true });

export default mongoose.model('PayementBox', payementBoxSchema);
