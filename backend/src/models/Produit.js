const mongoose = require('mongoose');

const produitSchema = new mongoose.Schema({
    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true, index: true },
    sku: { type: String, unique: true, sparse: true },
    titre: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true },
    description: String,
    descriptionCourte: String,
    categorieId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    sousCategoriesIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    tags: [String],

    images: [{
        url: String,
        ordre: Number,
        isMain: Boolean
    }],

    hasVariations: { type: Boolean, default: false },
    attributs: [{
        nom: String,
        valeurs: [String]
    }],

    prixBaseActuel: { type: Number, min: 0 },

    stock: {
        quantite: { type: Number, default: 0, min: 0 },
        seuilAlerte: { type: Number, default: 5 }
    },

    noteMoyenne: { type: Number, min: 0, max: 5, default: 0 },
    nombreAvis: { type: Number, default: 0 },
    nombreVentes: { type: Number, default: 0 },
    estActif: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    publishedAt: Date
});

produitSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (this.isNew && this.estActif) {
        this.publishedAt = Date.now();
    }
    next();
});

module.exports = mongoose.model('Produit', produitSchema);
