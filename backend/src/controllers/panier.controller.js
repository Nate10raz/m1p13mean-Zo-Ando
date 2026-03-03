import {
  getPanier,
  addToPanier,
  updateItemQuantity,
  removeItem,
  clearPanier,
} from '../services/panier.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: Panier
 *     description: Gestion temporaire des articles avant commande (Client)
 */

/**
 * @openapi
 * /panier:
 *   get:
 *     tags: [Panier]
 *     summary: Consulter le panier actuel
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Détails du panier incluant produits, variations et sous-totaux }
 */
export const getPanierController = async (req, res, next) => {
  try {
    const result = await getPanier(req.user.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Panier récupéré',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /panier/add:
 *   post:
 *     tags: [Panier]
 *     summary: Ajouter un article ou augmenter sa quantité
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId]
 *             properties:
 *               produitId: { type: string, description: "ID du produit" }
 *               variationId: { type: string, description: "ID de la variation spécifique (taille, couleur, etc.)" }
 *               quantite: { type: integer, minimum: 1, default: 1, example: 2 }
 *     responses:
 *       200: { description: Panier mis à jour }
 */
export const addToPanierController = async (req, res, next) => {
  try {
    const { produitId, variationId, quantite } = req.body;
    const result = await addToPanier(req.user.id, { produitId, variationId, quantite });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Article ajouté au panier',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /panier/update:
 *   put:
 *     tags: [Panier]
 *     summary: Redéfinir la quantité exacte d'un article
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, quantite]
 *             properties:
 *               produitId: { type: string }
 *               variationId: { type: string }
 *               quantite: { type: integer, minimum: 0, description: "0 pour supprimer l'article" }
 *     responses:
 *       200: { description: Quantité recalculée }
 */
export const updateQuantityController = async (req, res, next) => {
  try {
    const { produitId, variationId, quantite } = req.body;
    const result = await updateItemQuantity(req.user.id, { produitId, variationId, quantite });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Quantité mise à jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /panier/remove:
 *   post:
 *     tags: [Panier]
 *     summary: Supprimer un article spécifique du panier
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId]
 *             properties:
 *               produitId: { type: string }
 *               variationId: { type: string }
 *     responses:
 *       200: { description: Article éjecté du panier }
 */
export const removeFromPanierController = async (req, res, next) => {
  try {
    const { produitId, variationId } = req.body;
    const result = await removeItem(req.user.id, { produitId, variationId });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Article supprimé du panier',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /panier/clear:
 *   delete:
 *     tags: [Panier]
 *     summary: Vider tout le panier
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Panier remis à zéro }
 */
export const clearPanierController = async (req, res, next) => {
  try {
    const result = await clearPanier(req.user.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Panier vidé',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
