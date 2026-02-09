import mongoose from 'mongoose';

const payementBoxSchema = new mongoose.Schema({
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true, index: true },
  prixBoxeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HistoriquePrixBox',
    required: true,
    index: true,
  },
  montant: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['en_attente', 'valide', 'rejete'],
    default: 'en_attente',
    index: true,
  },
  dateValidation: Date,
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model('PayementBox', payementBoxSchema);
