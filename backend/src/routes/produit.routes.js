import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createProduitController,
  getProduitController,
  listProduitsController,
  updateProduitController,
  deleteProduitImageController,
} from '../controllers/produit.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';
import { productImageUpload } from '../middlewares/upload.middleware.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Produits
 *     description: Gestion des produits
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const uploadImages = (req, res, next) => {
  productImageUpload(req, res, (err) => {
    if (err) {
      return badRequestResponse(req, res, err.message || 'Upload error');
    }
    return next();
  });
};

const maybeUploadImages = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return uploadImages(req, res, next);
  }
  return next();
};

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'boutique'),
  maybeUploadImages,
  [
    body('boutiqueId').optional().isMongoId().withMessage('boutiqueId invalide'),
    body('titre').isString().notEmpty().withMessage('Titre requis'),
    body('slug').optional().isString(),
    body('description').optional().isString(),
    body('descriptionCourte').optional().isString(),
    body('categorieId').isMongoId().withMessage('categorieId invalide'),
    body('sousCategoriesIds').optional(),
    body('tags').optional(),
    body('attributs').optional(),
    body('prixBaseActuel').isFloat({ min: 0 }).withMessage('prixBaseActuel invalide'),
    body('stock').optional(),
    body('hasVariations').optional().isBoolean().toBoolean(),
    body('estActif').optional().isBoolean().toBoolean(),
    body('sku').optional().isString(),
  ],
  validateRequest,
  createProduitController,
);

router.get(
  '/',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('estActif').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  listProduitsController,
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  [param('id').isMongoId().withMessage('Id produit invalide')],
  validateRequest,
  getProduitController,
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'boutique'),
  maybeUploadImages,
  [
    param('id').isMongoId().withMessage('Id produit invalide'),
    body('boutiqueId').optional().isMongoId().withMessage('boutiqueId invalide'),
    body('titre').optional().isString(),
    body('slug').optional().isString(),
    body('description').optional().isString(),
    body('descriptionCourte').optional().isString(),
    body('categorieId').optional().isMongoId().withMessage('categorieId invalide'),
    body('sousCategoriesIds').optional(),
    body('tags').optional(),
    body('attributs').optional(),
    body('prixBaseActuel').optional().isFloat({ min: 0 }).withMessage('prixBaseActuel invalide'),
    body('stock').optional(),
    body('hasVariations').optional().isBoolean().toBoolean(),
    body('estActif').optional().isBoolean().toBoolean(),
    body('sku').optional().isString(),
    body('images').optional(),
  ],
  validateRequest,
  updateProduitController,
);

router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('admin', 'boutique'),
  [
    param('id').isMongoId().withMessage('Id produit invalide'),
    param('imageId').isMongoId().withMessage('Id image invalide'),
  ],
  validateRequest,
  deleteProduitImageController,
);

/**
 * @openapi
 * /produits:
 *   get:
 *     tags: [Produits]
 *     summary: Lister les produits
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: estActif
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Liste des produits }
 *       403: { description: Forbidden }
 */

/**
 * @openapi
 * /produits/{id}:
 *   get:
 *     tags: [Produits]
 *     summary: Recuperer un produit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Produit }
 *       403: { description: Forbidden }
 *       404: { description: Produit introuvable }
 */

/**
 * @openapi
 * /produits:
 *   post:
 *     tags: [Produits]
 *     summary: Creer un produit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [boutiqueId, titre, categorieId, prixBaseActuel]
 *             properties:
 *               boutiqueId: { type: string }
 *               titre: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               descriptionCourte: { type: string }
 *               categorieId: { type: string }
 *               sousCategoriesIds:
 *                 type: string
 *                 description: "JSON array ou string separee par des virgules"
 *               tags:
 *                 type: string
 *                 description: "JSON array ou string separee par des virgules"
 *               attributs:
 *                 type: string
 *                 description: "JSON array d'attributs"
 *               prixBaseActuel: { type: number }
 *               stock:
 *                 type: string
 *                 description: "JSON object { quantite, seuilAlerte }"
 *               hasVariations: { type: boolean }
 *               estActif: { type: boolean }
 *               sku: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201: { description: Produit cree }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 *       500: { description: Cloudinary non configure }
 */

/**
 * @openapi
 * /produits/{id}:
 *   patch:
 *     tags: [Produits]
 *     summary: Mettre a jour un produit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               boutiqueId: { type: string }
 *               titre: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               descriptionCourte: { type: string }
 *               categorieId: { type: string }
 *               sousCategoriesIds:
 *                 type: string
 *                 description: "JSON array ou string separee par des virgules"
 *               tags:
 *                 type: string
 *                 description: "JSON array ou string separee par des virgules"
 *               attributs:
 *                 type: string
 *                 description: "JSON array d'attributs"
 *               prixBaseActuel: { type: number }
 *               stock:
 *                 type: string
 *                 description: "JSON object { quantite, seuilAlerte }"
 *               hasVariations: { type: boolean }
 *               estActif: { type: boolean }
 *               sku: { type: string }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200: { description: Produit mis a jour }
 *       400: { description: Donnees invalides }
 *       403: { description: Forbidden }
 *       404: { description: Produit introuvable }
 *       500: { description: Cloudinary non configure }
 */

/**
 * @openapi
 * /produits/{id}/images/{imageId}:
 *   delete:
 *     tags: [Produits]
 *     summary: Supprimer une image d'un produit
 *     security:
 *       - bearerAuth: []
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
 *       200: { description: Image supprimee }
 *       403: { description: Forbidden }
 *       404: { description: Produit ou image introuvable }
 *       500: { description: Erreur Cloudinary }
 */

export default router;
