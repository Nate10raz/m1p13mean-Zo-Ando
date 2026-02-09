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
});

export default mongoose.model('PayementBox', payementBoxSchema);
