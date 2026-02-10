import mongoose from 'mongoose';

const publicationSchema = new mongoose.Schema({
  // L'auteur peut être une Boutique ou un Admin (User)
  // Pour simplifier, on stocke souvent l'ID de la boutique si c'est une boutique, ou User si Admin
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', index: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Si posté par admin system

  roleAuteur: { type: String, enum: ['boutique', 'admin'], required: true },

  contenu: { type: String, required: true },
  medias: [String], // URLs des images/vidéos

  // Système de Likes simple
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },

  statut: {
    type: String,
    enum: ['publie', 'brouillon', 'archive'],
    default: 'publie',
    index: true,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hook pour mettre à jour likesCount automatiquement avant sauvegarde si le tableau a changé
publicationSchema.pre('save', function (next) {
  if (this.isModified('likes')) {
    this.likesCount = this.likes.length;
  }
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Publication', publicationSchema);
