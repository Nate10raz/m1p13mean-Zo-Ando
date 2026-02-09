import mongoose from 'mongoose';

const commandeSchema = new mongoose.Schema({
  numeroCommande: { type: String, unique: true, required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  clientInfo: {
    nom: String,
    prenom: String,
    email: String,
    telephone: String,
  },

  boutiques: [
    {
      name: String,
      boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique' },

      estAccepte: { type: Boolean, default: false },
      dateAcceptation: Date,

      // Pour types 'collect' et 'livraison_supermarche'
      depotEntrepot: {
        estFait: { type: Boolean, default: false },
        dateDepot: Date,
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateValidation: Date,
      },

      items: [
        {
          produitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produit', required: true },
          variationId: { type: mongoose.Schema.Types.ObjectId, ref: 'VariationProduit' },
          boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boutique', required: true },
          prixId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prix', required: true },
          quantite: { type: Number, required: true, min: 1 },
          prixUnitaire: { type: Number, required: true, min: 0 },
          nomProduit: String,
          imageProduit: String,
          couponOrPromotionsUtiliseIds: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'CouponOrPromotion' },
          ],
        },
      ],

      status: {
        type: String,
        enum: [
          'en_preparation',
          'peut_etre_collecte',
          'annulee',
          'en_attente_validation',
          'non_acceptee',
        ],
        required: true,
        index: true,
      },
    },
  ],

  // Pour type 'collect'
  validationCollection: {
    estCollecte: { type: Boolean, default: false },
    dateCollection: Date,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateValidation: Date,
  },

  // Pour types 'livraison_supermarche' et 'livraison_boutique'
  validationLivraison: {
    estLivre: { type: Boolean, default: false },
    dateLivraison: Date,
    validateurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin ou Client ou Boutique
    dateValidation: Date,
  },

  adresseLivraison: String,

  paiement: {
    methode: { type: String, enum: ['carte', 'especes', 'virement'], required: true },
    statut: { type: String, enum: ['paye', 'non_paye'], default: 'non_paye' },
    transactionId: String,
    montantPaye: Number,
    datePaiement: Date,
  },

  baseTotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  typedelivery: {
    type: String,
    enum: ['all', 'livraison_supermarche', 'livraison_boutique', 'collect', 'boutique'],
    required: true,
    index: true,
  },

  dateDeliveryOrAbleCollect: Date,

  statusLivraison: {
    type: String,
    enum: [
      'pret_a_collecte',
      'en_preparation',
      'peut_etre_collecte',
      'en_livraison',
      'annulee',
      'en_attente_validation',
      'non_acceptee',
    ],
    required: true,
    index: true,
  },

  estAccepte: { type: Boolean, default: false },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

commandeSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Générer un numéro de commande unique
commandeSchema.pre('save', async function (next) {
  if (!this.numeroCommande) {
    const count = await this.constructor.countDocuments();
    this.numeroCommande = `CMD${Date.now()}${String(count + 1).padStart(6, '0')}`;
  }
});

export default mongoose.model('Commande', commandeSchema);
