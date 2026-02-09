import mongoose from 'mongoose';

const historiquePrixBoxSchema = new mongoose.Schema({
  boxId: { type: mongoose.Schema.Types.ObjectId, ref: 'Box', required: true, index: true },
  montant: { type: Number, required: true, min: 0 },
  unite: { type: String, enum: ['mois', 'annee'], required: true },
  dateDebut: { type: Date, required: true },
  dateFin: Date,
  raison: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('HistoriquePrixBox', historiquePrixBoxSchema);
