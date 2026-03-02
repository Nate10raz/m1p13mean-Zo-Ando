import mongoose from 'mongoose';

const fermetureBoutiqueSchema = new mongoose.Schema({
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', index: true, default: null }, // null = Supermarché
  debut: { type: Date, required: true },
  fin: { type: Date, required: true },
  motif: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

fermetureBoutiqueSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('FermetureBoutique', fermetureBoutiqueSchema);
