import {
  createProduit,
  getProduitById,
  listProduits,
  getLandingProduits,
  updateProduit,
  removeProduitImage,
  setProduitMainImage,
  updateProduitStockAlert,
  updateProduitStockAlertBulk,
} from '../services/produit.service.js';
import cloudinary from '../config/cloudinary.js';
import { ENV } from '../config/env.js';

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      },
    );
    stream.end(file.buffer);
  });
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: Produits
 *     description: Gestion du catalogue de produits, stocks et images
 */

/**
 * @openapi
 * /produits:
 *   post:
 *     tags: [Produits]
 *     summary: Créer un nouveau produit (Boutique/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [boutiqueId, titre, categoriesIds, prixBaseActuel]
 *             properties:
 *               boutiqueId: { type: string, description: "ID de la boutique propriétaire" }
 *               titre: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               descriptionCourte: { type: string }
 *               categorieId: { type: string }
 *               sousCategoriesIds: { type: string, description: "Array JSON [ID1, ID2]" }
 *               tags: { type: string, description: "Array JSON ou string séparée par virgules" }
 *               attributs: { type: string, description: "JSON Array d'attributs [{nom, valeur, type}]" }
 *               prixBaseActuel: { type: number }
 *               stock: { type: string, description: "JSON {quantite, seuilAlerte}" }
 *               hasVariations: { type: boolean }
 *               estActif: { type: boolean, default: true }
 *               sku: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201: { description: Produit créé avec succès }
 */
export const createProduitController = async (req, res, next) => {
  try {
    if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
      return next(new Error('Cloudinary configuration is missing'));
    }
    const files = Array.isArray(req.files) ? req.files : [];
    const uploads = files.length
      ? await Promise.all(
          files.map((file) => uploadToCloudinary(file, ENV.CLOUDINARY_FOLDER || 'products')),
        )
      : [];
    const images = uploads.map((result, index) => ({
      url: result.secure_url,
      ordre: index + 1,
      isMain: index === 0,
      publicId: result.public_id,
    }));

    const result = await createProduit(
      {
        ...req.body,
        images,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 201,
      message: 'Produit cree',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/{id}:
 *   get:
 *     tags: [Produits]
 *     summary: Récupérer un produit par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails du produit (vue filtrée selon le rôle) }
 *       404: { description: Produit introuvable }
 */
export const getProduitController = async (req, res, next) => {
  try {
    const result = await getProduitById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Produit',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits:
 *   get:
 *     tags: [Produits]
 *     summary: Lister les produits (Catalogue public ou Boutique)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: estActif
 *         schema: { type: boolean }
 *       - in: query
 *         name: categorieId
 *         schema: { type: string }
 *       - in: query
 *         name: minPrix
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: maxPrix
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name-asc, name-desc, price-asc, price-desc, created-asc, created-desc]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Liste paginée des produits }
 */
export const listProduitsController = async (req, res, next) => {
  try {
    const result = await listProduits(
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estActif: req.query.estActif,
        categorieId: req.query.categorieId,
        minPrix: req.query.minPrix,
        maxPrix: req.query.maxPrix,
        sort: req.query.sort,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des produits',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/landing:
 *   get:
 *     tags: [Produits]
 *     summary: Produits recommandés pour la page d'accueil
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 20, default: 6 }
 *     responses:
 *       200: { description: Sélection de produits (nouveautés, meilleures ventes) }
 */
export const getLandingProduitsController = async (req, res, next) => {
  try {
    const result = await getLandingProduits({
      limit: req.query.limit,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Produits landing',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/{id}:
 *   patch:
 *     tags: [Produits]
 *     summary: Mettre à jour un produit (Boutique/Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titre: { type: string }
 *               prixBaseActuel: { type: number }
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: Produit mis à jour }
 */
export const updateProduitController = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    let images = [];

    if (files.length) {
      if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
        return next(new Error('Cloudinary configuration is missing'));
      }
      const uploads = await Promise.all(
        files.map((file) => uploadToCloudinary(file, ENV.CLOUDINARY_FOLDER || 'products')),
      );
      images = uploads.map((result, index) => ({
        url: result.secure_url,
        ordre: index + 1,
        isMain: index === 0,
        publicId: result.public_id,
      }));
    }

    const result = await updateProduit(
      req.params.id,
      {
        ...req.body,
        images,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Produit mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/{id}/images/{imageId}:
 *   delete:
 *     tags: [Produits]
 *     summary: Supprimer une image d'un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Image supprimée }
 */
export const deleteProduitImageController = async (req, res, next) => {
  try {
    const result = await removeProduitImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Image supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/{id}/images/{imageId}/main:
 *   patch:
 *     tags: [Produits]
 *     summary: Définir une image comme image principale
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Image mise en avant }
 */
export const setProduitMainImageController = async (req, res, next) => {
  try {
    const result = await setProduitMainImage(req.params.id, req.params.imageId, {
      userId: req.user?.id,
      role: req.user?.role,
    });

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Image principale mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/{id}/stock-alert:
 *   patch:
 *     tags: [Produits]
 *     summary: Configurer le seuil d'alerte de stock pour un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seuilAlerte]
 *             properties:
 *               seuilAlerte: { type: number, minimum: 0 }
 *               variationId: { type: string, description: "Optionnel pour les produits avec variations" }
 *     responses:
 *       200: { description: Seuil mis à jour }
 */
export const updateProduitStockAlertController = async (req, res, next) => {
  try {
    const result = await updateProduitStockAlert(
      req.params.id,
      {
        seuilAlerte: req.body.seuilAlerte,
        variationId: req.body.variationId,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: "Seuil d'alerte mis a jour",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /produits/stock-alert/bulk:
 *   patch:
 *     tags: [Produits]
 *     summary: Mise à jour massive des seuils d'alerte stock
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seuilAlerte]
 *             properties:
 *               ids: { type: array, items: { type: string }, description: "Liste d'IDs produits" }
 *               categorieId: { type: string, description: "Tous les produits d'une catégorie" }
 *               seuilAlerte: { type: number }
 *     responses:
 *       200: { description: Seuils mis à jour en masse }
 */
export const updateProduitStockAlertBulkController = async (req, res, next) => {
  try {
    const result = await updateProduitStockAlertBulk(
      {
        ids: req.body.ids,
        categorieId: req.body.categorieId,
        seuilAlerte: req.body.seuilAlerte,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    apiResponse({
      req,
      res,
      status: 200,
      message: "Seuils d'alerte mis a jour",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
