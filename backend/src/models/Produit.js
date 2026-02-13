import mongoose from 'mongoose';
import Category from './Category.js';

const produitSchema = new mongoose.Schema({
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boutique',
    required: true,
    index: true,
  },
  sku: { type: String, unique: true, sparse: true },
  titre: { type: String, required: true, index: true },
  slug: { type: String, required: true, index: true },
  description: String,
  descriptionCourte: String,
  categorieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  sousCategoriesIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [String],

  images: [
    {
      url: String,
      ordre: Number,
      isMain: Boolean,
    },
  ],

  hasVariations: { type: Boolean, default: false },
  attributs: [
    {
      nom: String,
      valeurs: [String],
    },
  ],

  prixBaseActuel: { type: Number, min: 0 },

  stock: {
    quantite: { type: Number, default: 0, min: 0 },
    seuilAlerte: { type: Number, default: 5 },
  },

  noteMoyenne: { type: Number, min: 0, max: 5, default: 0 },
  nombreAvis: { type: Number, default: 0 },
  nombreVentes: { type: Number, default: 0 },
  estActif: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date,
});

produitSchema.pre('save', function () {
  this.updatedAt = Date.now();
  if (this.isNew && this.estActif) {
    this.publishedAt = Date.now();
  }
});

const ensureLeafCategories = async (ids) => {
  if (!ids.length) return;
  const nonLeaf = await Category.findOne({ parentId: { $in: ids } })
    .select('_id')
    .lean();
  if (nonLeaf) {
    const err = new Error('Seules les categories feuilles peuvent etre associees a un produit');
    err.status = 400;
    throw err;
  }
};

produitSchema.pre('validate', async function (next) {
  try {
    const ids = [];
    if (this.isNew || this.isModified('categorieId')) {
      if (this.categorieId) ids.push(this.categorieId);
    }
    if (this.isNew || this.isModified('sousCategoriesIds')) {
      if (Array.isArray(this.sousCategoriesIds)) {
        ids.push(...this.sousCategoriesIds);
      }
    }
    const uniqueIds = [...new Set(ids.map((id) => id.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    await ensureLeafCategories(uniqueIds);
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('Produit', produitSchema);
