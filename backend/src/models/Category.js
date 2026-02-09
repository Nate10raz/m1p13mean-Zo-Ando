import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  nom: { type: String, unique: true, required: true, index: true },
  slug: { type: String, unique: true, required: true, index: true },
  description: String,
  image: String,
  icon: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  chemin: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  niveau: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

categorySchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('Category', categorySchema);
