import mongoose from 'mongoose';

const boxTypeSchema = new mongoose.Schema({
  nom: { type: String, unique: true, required: true, index: true },
  description: String,
  caracteristiques: [
    {
      nom: String,
      valeur: String,
    },
  ],
  estActif: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

boxTypeSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('BoxType', boxTypeSchema);
