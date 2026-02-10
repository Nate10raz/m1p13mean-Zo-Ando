import mongoose from 'mongoose';

const userTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, index: true },
  type: { type: String, enum: ['access', 'refresh'], default: 'refresh' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index to automatically delete expired tokens
userTokenSchema.index({ userId: 1, tokenHash: 1 });
userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('UserToken', userTokenSchema);
