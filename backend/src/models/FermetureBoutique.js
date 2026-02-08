const mongoose = require('mongoose');

const fermetureBoutiqueSchema = new mongoose.Schema({
    typeFermeture: {
        type: String,
        enum: ["all", "livraison_supermarche", "livraison_boutique", "collect", "boutique"],
        required: true,
        index: true
    },

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", index: true },

    dateDebut: {
        type: Date,
        required: true,
        index: true,
        set: function (val) {
            // Normaliser à minuit
            const date = new Date(val);
            date.setHours(0, 0, 0, 0);
            return date;
        }
    },

    dateFin: {
        type: Date,
        required: true,
        index: true,
        set: function (val) {
            // Normaliser à minuit
            const date = new Date(val);
            date.setHours(0, 0, 0, 0);
            return date;
        }
    },

    raison: { type: String, required: true },
    description: String,

    typeJour: {
        type: String,
        enum: ["ponctuel", "annuel"],
        default: "ponctuel"
    },

    jourRecurrent: {
        jour: Number,
        mois: Number
    },

    messageClient: String,
    estActive: { type: Boolean, default: true, index: true },
    creePar: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Validation pour s'assurer que dateFin >= dateDebut
fermetureBoutiqueSchema.path('dateFin').validate(function (value) {
    return value >= this.dateDebut;
}, 'La date de fin doit être après la date de début');

fermetureBoutiqueSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('FermetureBoutique', fermetureBoutiqueSchema);
