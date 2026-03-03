import mongoose from 'mongoose';

const publicationVueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  publicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publication',
    required: true,
    index: true,
  },
  viewedAt: { type: Date, default: Date.now },
});

// Empêcher les doublons de vue pour un utilisateur sur une publication
publicationVueSchema.index({ userId: 1, publicationId: 1 }, { unique: true });

export default mongoose.model('PublicationVue', publicationVueSchema);
