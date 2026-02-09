# Modèles Mongoose

## 1. **User** (models/User.js)
Ce modèle représente les utilisateurs de la plateforme avec trois rôles : admin, boutique et client. Il contient les informations d'authentification, les données personnelles et les préférences de chaque utilisateur.

**Champs principaux :**
- `email` : Adresse email unique et obligatoire, indexée
- `passwordHash` : Mot de passe chiffré, obligatoire
- `role` : Rôle de l'utilisateur (admin, boutique, client), obligatoire, indexé
- `nom` et `prenom` : Nom et prénom
- `telephone` : Numéro de téléphone
- `avatar` : URL de l'image de profil
- `adresseLivraison` : Adresse de livraison par défaut
- `boutiqueId` : Référence à la boutique (pour les utilisateurs boutique)
- `panierId` : Référence au panier actif
- `isEmailVerified` : Statut de vérification d'email
- `lastLogin` : Date de dernière connexion
- `preferences` : Préférences utilisateur
    - `notifications` : 
        - `email` : Boolean (default: true)
        - `inApp` : Boolean (default: true)
- `isActive` : Statut du compte (actif/inactif)
- `createdAt` : Date de création
- `updatedAt` : Date de dernière modification

## 2. **Boutique** (models/Boutique.js)
Modèle pour les boutiques des commerçants, contenant les informations commerciales, les horaires et les configurations de livraison.

**Champs principaux :**
- `userId` : Référence unique au propriétaire (User)
- `nom` : Nom unique de la boutique, indexé
- `description` : Description de la boutique
- `logo` et `banner` : Images de la boutique
- `adresse` : Adresse physique
- `boxId` : Référence au box attribué, unique
- `horaires` : Tableau des horaires d'ouverture par jour
- `clickCollectActif` : Activation du click & collect
- `plage_livraison_boutique` : Plages horaires pour la livraison
- `status` : Statut d'approbation (en_attente, active, etc.)
- `statusLivreur` : Statut du livreur associé
- `accepteLivraisonJourJ` : Acceptation des livraisons jour J
- `noteMoyenne` et `nombreAvis` : Notation de la boutique
- `validatedBy` : Administrateur ayant validé la boutique

## 3. **Box** (models/Box.js)
Représente les boxes/emplacements physiques dans le marché, avec leurs caractéristiques et leur occupation.

**Champs principaux :**
- `numero` : Numéro unique du box, indexé
- `etage` : Étage, obligatoire
- `zone` et `allee` : Localisation dans le marché
- `position` : Position spécifique
- `description` : Description détaillée
- `caracteristiques` : Liste des caractéristiques techniques
- `photos` : Galerie d'images
- `superficie` : Superficie en m², obligatoire
- `tarifActuel` : Tarification actuelle avec période
- `estOccupe` : Indicateur d'occupation
- `boutiqueId` : Référence à la boutique occupant le box
- `contrat` : Informations sur le contrat de location

## 4. **HistoriquePrixBox** (models/HistoriquePrixBox.js)
Historique des changements de prix des boxes pour le suivi tarifaire.

**Champs principaux :**
- `boxId` : Référence au box concerné, indexé
- `montant` : Montant du prix, minimum 0
- `unite` : Unité de facturation (mois/année)
- `dateDebut` et `dateFin` : Période d'application
- `raison` : Justification du changement
- `createdBy` : Auteur du changement

## 5. **PayementBox** (models/PayementBox.js)
Enregistrement des paiements des boxes par les commerçants.

**Champs principaux :**
- `boxId` : Référence au box, indexé
- `prixBoxeId` : Référence au prix applicable, indexé
- `montant` : Montant payé, minimum 0
- `date` : Date du paiement
- `status` : Statut du paiement (en_attente, valide, rejete), par défaut en_attente, indexé
- `dateValidation` : Date de validation par l'admin
- `adminId` : Référence à l'admin qui a validé


## 6. **Category** (models/Category.js)
Catégories et sous-catégories pour l'organisation des produits.

**Champs principaux :**
- `nom` : Nom unique, indexé
- `slug` : Slug unique pour les URLs, indexé
- `description` : Description de la catégorie
- `image` et `icon` : Représentations visuelles
- `parentId` : Référence à la catégorie parente
- `chemin` : Chemin hiérarchique complet
- `niveau` : Niveau dans la hiérarchie
- `isActive` : Statut d'activation

## 7. **Produit** (models/Produit.js)
Produits vendus par les boutiques, avec gestion des variations et du stock.

**Champs principaux :**
- `boutiqueId` : Référence à la boutique propriétaire, indexé
- `sku` : Code SKU unique optionnel
- `titre` : Titre du produit, indexé
- `slug` : Slug pour les URLs, indexé
- `description` et `descriptionCourte` : Descriptions détaillée et courte
- `categorieId` : Catégorie principale, indexé
- `sousCategoriesIds` : Sous-catégories
- `tags` : Mots-clés
- `images` : Galerie d'images avec ordre et image principale
- `hasVariations` : Indicateur de variations
- `attributs` : Attributs pour les variations
- `prixBaseActuel` : Prix de base actuel
- `stock` : Gestion du stock avec seuil d'alerte
- `noteMoyenne`, `nombreAvis`, `nombreVentes` : Statistiques
- `estActif` : Statut de publication
- `publishedAt` : Date de publication

## 8. **VariationProduit** (models/VariationProduit.js)
Variations spécifiques d'un produit (couleurs, tailles, etc.).

**Champs principaux :**
- `produitId` : Référence au produit parent, indexé
- `sku` : SKU unique optionnel pour la variation
- `combinaison` : Combinaison d'attributs spécifique
- `prixBaseActuel` : Prix spécifique à la variation
- `stock` : Stock spécifique à la variation
- `images` : Images spécifiques à la variation
- `isActive` : Statut d'activation

## 9. **Prix** (models/Prix.js)
Historique des prix pour les produits et leurs variations.

**Champs principaux :**
- `produitId` : Référence au produit, indexé
- `variationId` : Référence à la variation, indexé
- `valeur` : Valeur du prix, minimum 0
- `dateDebut` et `dateFin` : Période de validité
- `estActif` : Statut d'activation
- `createdBy` : Auteur du prix

**Validation :** Au moins un des champs `produitId` ou `variationId` doit être fourni.

## 10. **Panier** (models/Panier.js)
Panier d'achat des clients avec expiration automatique.

**Champs principaux :**
- `clientId` : Référence unique au client, obligatoire
- `items` : Liste des articles avec informations détaillées
- `updatedAt` : Date de dernière modification
- `expiresAt` : Date d'expiration (30 jours)

## 11. **Commande** (models/Commande.js)
Commandes passées par les clients avec suivi multi-boutiques.

**Champs principaux :**
- `numeroCommande` : Numéro unique généré automatiquement, indexé
- `clientId` : Référence au client, indexé
- `clientInfo` : Informations du client au moment de la commande
- `boutiques` : Commandes groupées par boutique
    - `estAccepte` : Acceptation par la boutique
    - `dateAcceptation` : Date d'acceptation
    - `depotEntrepot` : Suivi dépôt (Collect/Supermarché)
        - `estFait` : Dépôt effectué
        - `dateDepot` : Date de dépôt
        - `adminId` : Validateur (Admin)
        - `dateValidation` : Date de validation
- `validationCollection` : Suivi Collecte (Click & Collect)
    - `estCollecte` : Collecte effectuée
    - `dateCollection` : Date de collecte
    - `adminId` : Validateur (Admin)
    - `dateValidation` : Date de validation
- `validationLivraison` : Suivi Livraison (Supermarché/Boutique)
    - `estLivre` : Livraison effectuée
    - `dateLivraison` : Date de livraison
    - `validateurId` : Validateur (Admin/Client/Boutique)
    - `dateValidation` : Date de validation
- `adresseLivraison` : Adresse de livraison
- `paiement` : Informations de paiement
- `baseTotal` et `total` : Totaux avant et après réduction
- `typedelivery` : Type de livraison, indexé
- `dateDeliveryOrAbleCollect` : Date de livraison/collecte
- `statusLivraison` : Statut global de livraison, indexé
- `estAccepte` : Indicateur d'acceptation de la commande
- `acceptedBy` : Utilisateur ayant accepté la commande


## 12. **CouponOrPromotion** (models/CouponOrPromotion.js)
Codes promotionnels et coupons de réduction.

**Champs principaux :**
- `code` : Code unique en majuscules, indexé
- `type` : Type (coupon ou promotion)
- `boutiqueId` : Référence à la boutique émettrice
- `typeReduction` : Type de réduction (pourcentage ou montant fixe)
- `valeur` : Valeur de la réduction
- `conditions` : Conditions d'application (produits, catégories, boutiques)
- `dateDebut` et `dateFin` : Période de validité
- `utilisationMax` : Nombre maximum d'utilisations
- `isActive` : Statut d'activation
- `evenementDeclencheur` : Événement déclenchant l'attribution auto (e.g. nouveau_compte), par défaut 'aucun'
- `conditionValue` : Valeur associée à la condition (e.g. montant, nombre de jours)


## 13. **PossessionCoupon** (models/PossessionCoupon.js)
Coupons en possession des utilisateurs.

**Champs principaux :**
- `sku` : Identifiant unique du coupon
- `couponId` : Référence au coupon, indexé
- `userId` : Référence au possesseur, indexé
- `used` : Indicateur d'utilisation
- `dateUtilisation` : Date d'utilisation

## 14. **Avis** (models/Avis.js)
Avis et notations des produits par les clients.

**Champs principaux :**
- `produitId` : Référence au produit, indexé
- `boutiqueId` : Référence à la boutique, indexé
- `clientId` : Référence au client, indexé
- `note` : Note de 1 à 5
- `commentaire` et `titre` : Contenu de l'avis
- `reponses` : Tableau de réponses
    - `message` : Contenu de la réponse
    - `dateReponse` : Date de la réponse
    - `userId` : ID de l'utilisateur qui a répondu
    - `roleRepondant` : Rôle du répondant (admin, boutique, client)
- `estSignale` : Statut de signalement
- `signalements` : Historique des signalements

## 15. **MouvementStock** (models/MouvementStock.js)
Historique des mouvements de stock pour le suivi.

**Champs principaux :**
- `produitId` : Référence au produit, indexé
- `variationId` : Référence à la variation
- `boutiqueId` : Référence à la boutique, indexé
- `type` : Type de mouvement (ajout, retrait, etc.)
- `quantite` : Quantité modifiée
- `stockAvant` et `stockApres` : États avant/après
- `reference` : Référence externe
- `commandeId` : Référence à la commande concernée
- `userId` : Auteur du mouvement
- `raison` : Justification du mouvement

## 16. **Notification** (models/Notification.js)
Notifications envoyées aux utilisateurs.

**Champs principaux :**
- `userId` : Référence au destinataire, indexé
- `type` : Type de notification
- `titre` et `message` : Contenu de la notification
- `data` : Données supplémentaires (commandes, produits, URLs)
- `lu` : Statut de lecture
- `lueAt` : Date de lecture

## 17. **Rapport** (models/Rapport.js)
Rapports générés pour l'analyse commerciale.

**Champs principaux :**
- `type` : Type de rapport (ventes, produits, etc.)
- `periode` : Période couverte
- `boutiqueId` et `categorieId` : Filtres optionnels
- `donnees` : Données du rapport (type mixte)
- `format` : Format de sortie (CSV ou PDF)
- `createdBy` : Créateur du rapport
- `urlFichier` : URL du fichier généré
- `taille` : Taille du fichier
- `termineAt` : Date de finalisation

## 18. **PasswordReset** (models/PasswordReset.js)
Jetons de réinitialisation de mot de passe avec expiration automatique.

**Champs principaux :**
- `userId` : Référence à l'utilisateur, indexé
- `token` : Jeton unique
- `expiresAt` : Date d'expiration
- `used` : Indicateur d'utilisation
- `createdAt` : Date de création

**Index TTL :** Expiration automatique après la date `expiresAt`.

## 19. **AlerteStock** (models/AlerteStock.js)
Alertes de stock bas pour les produits.

**Champs principaux :**
- `boutiqueId` : Référence à la boutique, indexé
- `produitId` : Référence au produit, indexé
- `variationId` : Référence à la variation
- `seuil` : Seuil de déclenchement, minimum 0
- `estActif` : Statut d'activation
- `dernierDeclenchement` : Date du dernier déclenchement

## 20. **FermetureBoutique** (models/FermetureBoutique.js)
Planning des fermetures exceptionnelles des boutiques.

**Champs principaux :**
- `typeFermeture` : Type de fermeture (all, livraison, etc.), indexé
- `boutiqueId` : Référence à la boutique, indexé
- `dateDebut` et `dateFin` : Période de fermeture, indexées
- `raison` et `description` : Justifications
- `typeJour` : Type (ponctuel ou annuel)
- `jourRecurrent` : Configuration pour les fermetures récurrentes
- `messageClient` : Message affiché aux clients
- `estActive` : Statut d'activation, indexé
- `creePar` : Créateur de la fermeture

**Validation :** `dateFin` doit être postérieure ou égale à `dateDebut`.

## 21. **FraisLivraison** (models/FraisLivraison.js)
Configuration des frais de livraison par boutique.

**Champs principaux :**
- `boutiqueId` : Référence à la boutique, indexé
- `min` et `max` : Plage d'application en quantite de produits (max = -1 pour illimité)
- `montant` : Montant des frais, minimum 0
- `type` : Type de frais (fixe ou pourcentage)
- `dateDebut` et `dateFin` : Période de validité
- `estActif` : Statut d'activation, indexé
- `description` : Description des frais
- `creePar` : Créateur de la configuration

## 22. **DemandeLocationBox** (models/DemandeLocationBox.js)
Gestion des demandes de location de box par les boutiques.

**Champs principaux :**
- `boutiqueId` : Référence à la boutique demanderesse, requis
- `boxId` : Référence au box souhaité, requis
- `dateDebut` : Date de début souhaitée
- `status` : Statut de la demande (en_attente, validee, rejetee, annulee)
- `adminId` : Administrateur ayant traité la demande
- `dateValidation` : Date de traitement
- `motif` : Motif de rejet ou commentaire

## 23. **UserToken** (models/UserToken.js)
Gestion des tokens d'accès et de refresh pour l'authentification.

**Champs principaux :**
- `userId` : Référence à l'utilisateur, requis
- `token` : Le token chiffré ou signé, indexé
- `type` : Type de token (access ou refresh)
- `createdAt` : Date de création
- `expiresAt` : Date d'expiration

## 24. **Publication** (models/Publication.js)
Système de publication (Fil d'actualité) pour les boutiques et administrateurs.

**Champs principaux :**
- `auteurId` : Auteur (Boutique ou Admin) - Référence `User` ou `Boutique` généralement
- `roleAuteur` : 'boutique' ou 'admin'
- `contenu` : Texte de la publication
- `medias` : Liste d'URL images/vidéos
- `likes` : Tableau des `userId` ayant aimé la publication
- `likesCount` : Compteur de likes (dénormalisé pour perfs)
- `statut` : 'publie', 'brouillon', 'archive'
- `createdAt` : Date de publication
