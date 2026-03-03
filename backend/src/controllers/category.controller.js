import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryTree,
  listCategories,
  seedCategories,
  updateCategory,
} from '../services/category.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: Catégories
 *     description: Gestion de l'arborescence des catégories de produits
 */

/**
 * @openapi
 * /categories/tree:
 *   get:
 *     tags: [Catégories]
 *     summary: Récupérer l'arborescence complète ou partielle des catégories
 *     parameters:
 *       - in: query
 *         name: rootId
 *         schema: { type: string }
 *         description: "ID de la catégorie racine pour obtenir un sous-arbre"
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: "Filtrer l'arbre par nom"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200: { description: Arborescence JSON des catégories avec enfants récursifs }
 */
export const getCategoryTreeController = async (req, res, next) => {
  try {
    const result = await getCategoryTree({
      rootId: req.query.rootId,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Arborescence des categories',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Catégories]
 *     summary: Lister les catégories (pagination simple ou filtre par parent)
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema: { type: string }
 *         description: "null pour les racines"
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste plate des catégories }
 */
export const listCategoriesController = async (req, res, next) => {
  try {
    const result = await listCategories({
      parentId: req.query.parentId,
      search: req.query.search,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des categories',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Catégories]
 *     summary: Récupérer les détails d'une catégorie par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails de la catégorie }
 *       404: { description: Catégorie introuvable }
 */
export const getCategoryController = async (req, res, next) => {
  try {
    const result = await getCategoryById(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Catégories]
 *     summary: Créer une nouvelle catégorie (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, slug]
 *             properties:
 *               nom: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               image: { type: string }
 *               icon: { type: string }
 *               isActive: { type: boolean, default: true }
 *               parentId: { type: string, nullable: true }
 *     responses:
 *       201: { description: Catégorie créée }
 *       409: { description: Conflit (Slug déjà utilisé ou parent invalide) }
 */
export const createCategoryController = async (req, res, next) => {
  try {
    const result = await createCategory(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Categorie creee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories/seed:
 *   post:
 *     tags: [Catégories]
 *     summary: Peupler les catégories initiales (Admin/Dev)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Catégories insérées avec succès }
 */
export const seedCategoriesController = async (req, res, next) => {
  try {
    const nodes = Array.isArray(req.body) ? req.body : req.body?.categories;
    const result = await seedCategories(nodes);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Categories inserees',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Catégories]
 *     summary: Mettre à jour une catégorie (Admin)
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
 *             properties:
 *               nom: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               image: { type: string }
 *               icon: { type: string }
 *               isActive: { type: boolean }
 *               parentId: { type: string, nullable: true }
 *     responses:
 *       200: { description: Catégorie mise à jour }
 */
export const updateCategoryController = async (req, res, next) => {
  try {
    const result = await updateCategory(req.params.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Catégories]
 *     summary: Supprimer une catégorie (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: force
 *         schema: { type: boolean, default: false }
 *         description: "Confirmer la suppression même si des avertissements existent"
 *     responses:
 *       200: { description: Catégorie supprimée }
 *       400: { description: Suppression impossible (catégorie non vide ou liée à des produits) }
 */
export const deleteCategoryController = async (req, res, next) => {
  try {
    const force =
      req.query.force === true ||
      req.query.force === 'true' ||
      req.query.force === 1 ||
      req.query.force === '1';
    const result = await deleteCategory(req.params.id, {
      force,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Categorie supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
