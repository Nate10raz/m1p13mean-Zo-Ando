const mongoose = require('mongoose');

const possessionCouponSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CouponOrPromotion',
    required: true,
    index: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  used: { type: Boolean, default: false },
  dateUtilisation: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PossessionCoupon', possessionCouponSchema);
