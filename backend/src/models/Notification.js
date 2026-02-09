const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  channel: {
    type: String,
    enum: ['in_app', 'email'],
    default: 'in_app',
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },

  titre: { type: String, required: true },
  message: { type: String, required: true },

  data: {
    commandeId: mongoose.Schema.Types.ObjectId,
    produitId: mongoose.Schema.Types.ObjectId,
    boutiqueId: mongoose.Schema.Types.ObjectId,
    url: String,
  },

  lu: { type: Boolean, default: false },
  lueAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
