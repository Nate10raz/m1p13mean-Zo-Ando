import {
  createAlerteStock,
  listAlerteStock,
  getAlerteStockById,
  updateAlerteStock,
  deleteAlerteStock,
} from '../services/alerte-stock.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: AlertesStock
 *     description: Gestion des notifications de stock bas pour les boutiques
 */

/**
 * @openapi
 * /alertes-stock:
 *   post:
 *     tags: [AlertesStock]
 *     summary: Configurer une nouvelle alerte de stock (Boutique/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, seuil]
 *             properties:
 *               produitId: { type: string, description: "ID du produit à surveiller" }
 *               variationId: { type: string, description: "Variation spécifique si applicable" }
 *               seuil: { type: number, minimum: 0, example: 5 }
 *               estActif: { type: boolean, default: true }
 *               methodeNotification: { type: array, items: { type: string, enum: [email, in-app] }, default: ["in-app"] }
 *     responses:
 *       201: { description: Alerte enregistrée }
 */
export const createAlerteStockController = async (req, res, next) => {
  try {
    const result = await createAlerteStock(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Alerte stock creee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /alertes-stock:
 *   get:
 *     tags: [AlertesStock]
 *     summary: Lister toutes les alertes configurées
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: produitId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des alertes de stock }
 */
export const listAlerteStockController = async (req, res, next) => {
  try {
    const result = await listAlerteStock(
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
      {
        page: req.query.page,
        limit: req.query.limit,
        produitId: req.query.produitId,
        variationId: req.query.variationId,
        estActif: req.query.estActif,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des alertes stock',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /alertes-stock/{id}:
 *   get:
 *     tags: [AlertesStock]
 *     summary: Détails d'une alerte spécifique
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Configuration de l'alerte }
 */
export const getAlerteStockController = async (req, res, next) => {
  try {
    const result = await getAlerteStockById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Alerte stock',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /alertes-stock/{id}:
 *   patch:
 *     tags: [AlertesStock]
 *     summary: Modifier le seuil ou activer/désactiver une alerte
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seuil: { type: number, minimum: 0 }
 *               estActif: { type: boolean }
 *     responses:
 *       200: { description: Alerte mise à jour }
 */
export const updateAlerteStockController = async (req, res, next) => {
  try {
    const result = await updateAlerteStock(req.params.id, req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Alerte stock mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /alertes-stock/{id}:
 *   delete:
 *     tags: [AlertesStock]
 *     summary: Supprimer définitivement une configuration d'alerte
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Alerte supprimée }
 */
export const deleteAlerteStockController = async (req, res, next) => {
  try {
    const result = await deleteAlerteStock(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Alerte stock supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
