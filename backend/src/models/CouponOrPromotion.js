import mongoose from 'mongoose';

const couponOrPromotionSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, index: true, uppercase: true },
  type: { type: String, enum: ['coupon', 'promotion'], required: true },
  boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' },

  typeReduction: { type: String, enum: ['pourcentage', 'montant_fixe'], required: true },
  valeur: { type: Number, required: true, min: 0 },

  conditions: {
    produitsIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Produit' }],
    categoriesIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    boutiquesIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' }],
  },

  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  utilisationMax: Number,
  isActive: { type: Boolean, default: true },

  evenementDeclencheur: {
    type: String,
    enum: [
      'aucun',
      'nouveau_compte',
      'anniversaire',
      'commande_montant',
      'inactivite',
      'nombre_commandes',
    ],
    default: 'aucun',
    index: true,
  },
  conditionValue: Number,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

couponOrPromotionSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

export default mongoose.model('CouponOrPromotion', couponOrPromotionSchema);
