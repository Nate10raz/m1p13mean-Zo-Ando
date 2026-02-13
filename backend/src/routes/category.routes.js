import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  createCategoryController,
  deleteCategoryController,
  getCategoryController,
  getCategoryTreeController,
  listCategoriesController,
  seedCategoriesController,
  updateCategoryController,
} from '../controllers/category.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { badRequestResponse } from '../utils/response.util.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Categories
 *     description: Gestion des categories
 */

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequestResponse(req, res, 'Validation error', errors.array());
  }
  return next();
};

const adminGuard = [requireAuth, requireRole('admin')];

router.get(
  '/tree',
  ...adminGuard,
  [
    query('rootId').optional().isMongoId().withMessage('rootId invalide'),
    query('search').optional().isString().trim().isLength({ min: 1 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  ],
  validateRequest,
  getCategoryTreeController,
);

/**
 * @openapi
 * /categories/tree:
 *   get:
 *     tags: [Categories]
 *     summary: Recuperer l'arborescence des categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rootId
 *         schema: { type: string }
 *         description: "ID de la categorie racine pour obtenir un sous-arbre"
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: "Recherche par nom (retourne uniquement l'arbre filtre)"
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         description: "Pagination quand search est fourni"
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 200 }
 *         description: "Taille de page quand search est fourni"
 *     responses:
 *       200: { description: Arborescence des categories }
 */

router.get(
  '/',
  [
    query('parentId').optional({ nullable: true }).isMongoId().withMessage('parentId invalide'),
    query('search').optional().isString().trim().isLength({ min: 1 }),
  ],
  validateRequest,
  listCategoriesController,
);

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Lister les categories actives
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema: { type: string }
 *         description: "Filtrer par parent (null/absent = racines)"
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: "Recherche par nom ou slug"
 *     responses:
 *       200: { description: Liste des categories }
 */

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Id categorie invalide')],
  validateRequest,
  getCategoryController,
);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Recuperer une categorie
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Categorie }
 *       404: { description: Categorie introuvable }
 */

router.post(
  '/',
  ...adminGuard,
  [
    body('nom').isString().notEmpty().withMessage('Nom requis'),
    body('slug').isString().notEmpty().withMessage('Slug requis'),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('icon').optional().isString(),
    body('isActive').optional().isBoolean().toBoolean(),
    body('parentId').optional({ nullable: true }).isMongoId().withMessage('parentId invalide'),
  ],
  validateRequest,
  createCategoryController,
);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Creer une categorie
 *     security:
 *       - bearerAuth: []
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
 *               isActive: { type: boolean }
 *               parentId: { type: string, nullable: true }
 *     responses:
 *       201: { description: Categorie creee }
 *       404: { description: Categorie parente introuvable }
 *       409: { description: Categorie parente avec produits }
 */

router.post(
  '/seed',
  ...adminGuard,
  [body('categories').optional().isArray()],
  validateRequest,
  seedCategoriesController,
);

/**
 * @openapi
 * /categories/seed:
 *   post:
 *     tags: [Categories]
 *     summary: Inserer un arbre de categories (test)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [nom]
 *                   properties:
 *                     nom: { type: string }
 *                     slug: { type: string }
 *                     description: { type: string }
 *                     image: { type: string }
 *                     icon: { type: string }
 *                     isActive: { type: boolean }
 *                     children:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           nom: { type: string }
 *                           slug: { type: string }
 *                           children: { type: array }
 *     responses:
 *       201: { description: Categories inserees }
 */

router.patch(
  '/:id',
  ...adminGuard,
  [
    param('id').isMongoId().withMessage('Id categorie invalide'),
    body('nom').optional().isString(),
    body('slug').optional().isString(),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('icon').optional().isString(),
    body('isActive').optional().isBoolean().toBoolean(),
    body('parentId').optional({ nullable: true }).isMongoId().withMessage('parentId invalide'),
  ],
  validateRequest,
  updateCategoryController,
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Mettre a jour une categorie
 *     security:
 *       - bearerAuth: []
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
 *       200: { description: Categorie mise a jour }
 *       400: { description: Deplacement invalide }
 *       404: { description: Categorie introuvable }
 *       409: { description: Categorie parente avec produits }
 */

router.delete(
  '/:id',
  ...adminGuard,
  [
    param('id').isMongoId().withMessage('Id categorie invalide'),
    query('force').optional().isBoolean().toBoolean(),
  ],
  validateRequest,
  deleteCategoryController,
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Supprimer une categorie (action explicite admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: force
 *         schema: { type: boolean }
 *         description: "Doit etre true pour confirmer la suppression"
 *     responses:
 *       200: { description: Categorie supprimee }
 *       400: { description: Suppression bloquee }
 *       404: { description: Categorie introuvable }
 *       409: { description: Categorie avec enfants ou produits }
 */

export default router;
