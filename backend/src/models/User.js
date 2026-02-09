import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'boutique', 'client'], required: true, index: true },
  nom: String,
  prenom: String,
  telephone: String,
  avatar: String,
  adresseLivraison: String,
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', index: true },
  panierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Panier' },
  isEmailVerified: { type: Boolean, default: false },
  lastLogin: Date,
  preferences: {
    notifications: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('User', userSchema);
