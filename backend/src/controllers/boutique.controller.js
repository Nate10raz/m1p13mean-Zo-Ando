import {
  getMyBoutique,
  updateMyBoutique,
  getBoutiqueById,
  updateBoutique,
  getBoutiqueSalesDashboard,
  getBoutiqueInventory,
  getBoutiqueStockMovements,
  exportBoutiqueStockMovementsCsv,
  exportBoutiqueStockMovementsGlobalCsv,
  createBoutiqueStockMovement,
  createBoutiqueStockMovementsBulk,
  importBoutiqueStockCsv,
  getLatestFraisLivraison,
} from '../services/boutique.service.js';
import { apiResponse } from '../utils/response.util.js';

import FermetureBoutique from '../models/FermetureBoutique.js';

/**
 * @openapi
 * tags:
 *   - name: Boutiques
 *     description: Gestion des boutiques (profil, dashboard, paramètres, fermetures)
 */

/**
 * @openapi
 * /boutiques/frais-livraison/supermarche:
 *   get:
 *     tags: [Boutiques]
 *     summary: Obtenir les frais de livraison supermarché actuels (Admin Marketplace fee)
 *     responses:
 *       200:
 *         description: Frais de livraison configurés par l'admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 montant: { type: number }
 *                 type: { type: string }
 */
export const getMarketplaceFeeController = async (req, res, next) => {
  try {
    const result = await getLatestFraisLivraison(null);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Frais de livraison supermarché',
      data: result || { montant: 5.0 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/closures/supermarket:
 *   get:
 *     tags: [Boutiques]
 *     summary: Lister les fermetures exceptionnelles du supermarché
 *     responses:
 *       200: { description: Liste des périodes de fermeture du supermarché }
 */
export const getSupermarketClosuresController = async (req, res, next) => {
  try {
    const closures = await FermetureBoutique.find({ boutiqueId: null, isActive: true });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Fermetures exceptionnelles supermarché',
      data: closures,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me:
 *   get:
 *     tags: [Boutiques]
 *     summary: Récupérer les détails de ma boutique (Propriétaire)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Détails complets de la boutique propriétaire }
 *       403: { description: Accès réservé aux boutiques }
 */
export const getMyBoutiqueController = async (req, res, next) => {
  try {
    const result = await getMyBoutique(req.user?.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Ma boutique',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/dashboard/ventes:
 *   get:
 *     tags: [Boutiques]
 *     summary: Dashboard des ventes et statistiques boutique (Propriétaire)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: topN
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 5 }
 *       - in: query
 *         name: granularity
 *         schema: { type: string, enum: [day, week, month], default: day }
 *     responses:
 *       200: { description: Données statistiques des ventes }
 */
export const getBoutiqueSalesDashboardController = async (req, res, next) => {
  try {
    const result = await getBoutiqueSalesDashboard(
      {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        topN: req.query.topN,
        granularity: req.query.granularity,
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
      message: 'Dashboard ventes boutique',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire:
 *   get:
 *     tags: [Boutiques]
 *     summary: Consulter l'état des stocks de la boutique (Propriétaire)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *       - in: query
 *         name: categorieId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste paginée des produits avec alertes stock }
 */
export const getBoutiqueInventoryController = async (req, res, next) => {
  try {
    const result = await getBoutiqueInventory(
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        lowStock: req.query.lowStock,
        categorieId: req.query.categorieId,
        estActif: req.query.estActif,
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
      message: 'Inventaire boutique',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire/mouvements:
 *   get:
 *     tags: [Boutiques]
 *     summary: Historique des flux de stock pour un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: produitId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv], default: json }
 *     responses:
 *       200: { description: Liste des entrées/sorties ou fichier CSV }
 */
export const getBoutiqueStockMovementsController = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const params = {
      produitId: req.query.produitId,
      page: req.query.page,
      limit: req.query.limit,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const auth = { userId: req.user?.id, role: req.user?.role };

    if (format === 'csv') {
      const result = await exportBoutiqueStockMovementsCsv(params, auth);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename || 'mouvements.csv'}"`,
      );
      return res.status(200).send(result.csv);
    }

    const result = await getBoutiqueStockMovements(params, auth);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Historique mouvements stock',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire/mouvements/export:
 *   get:
 *     tags: [Boutiques]
 *     summary: Export global des mouvements de stock en CSV
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Fichier CSV généré }
 */
export const exportBoutiqueStockMovementsGlobalCsvController = async (req, res, next) => {
  try {
    const result = await exportBoutiqueStockMovementsGlobalCsv(
      {
        type: req.query.type,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit,
        search: req.query.search,
        categorieId: req.query.categorieId,
        estActif: req.query.estActif,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename || 'mouvements-boutique.csv'}"`,
    );
    return res.status(200).send(result.csv);
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire/mouvements:
 *   post:
 *     tags: [Boutiques]
 *     summary: Enregistrer manuellement une entrée ou sortie de stock
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, type, quantite]
 *             properties:
 *               produitId: { type: string }
 *               type: { type: string, enum: [ajout, retrait, ajustement] }
 *               quantite: { type: integer, minimum: 1 }
 *               raison: { type: string, example: "Livraison fournisseur" }
 *     responses:
 *       201: { description: Mouvement validé }
 */
export const createBoutiqueStockMovementController = async (req, res, next) => {
  try {
    const result = await createBoutiqueStockMovement(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Mouvement de stock enregistre',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire/mouvements/bulk:
 *   post:
 *     tags: [Boutiques]
 *     summary: Mise à jour massive de l'inventaire physique (Inventaire tournant)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [produitId, stockPhysique]
 *                   properties:
 *                     produitId: { type: string }
 *                     stockPhysique: { type: integer }
 *     responses:
 *       201: { description: Inventaire mis à jour }
 */
export const createBoutiqueStockMovementsBulkController = async (req, res, next) => {
  try {
    const result = await createBoutiqueStockMovementsBulk(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inventaire rapide enregistre',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/me/inventaire/import:
 *   post:
 *     tags: [Boutiques]
 *     summary: Importer un état de stock depuis une liste JSON (ex. Excel conversion)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Import complété }
 */
export const importBoutiqueStockCsvController = async (req, res, next) => {
  try {
    const result = await importBoutiqueStockCsv(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Import CSV inventaire reussi',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @openapi
 * /boutiques/me:
 *   patch:
 *     tags: [Boutiques]
 *     summary: Mise à jour partielle du profil boutique (Propriétaire)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               description: { type: string }
 *               logo: { type: string }
 *               banner: { type: string }
 *               adresse: { type: string }
 *               telephone: { type: string }
 *               email: { type: string }
 *               clickCollectActif: { type: boolean }
 *               accepteLivraisonJourJ: { type: boolean }
 *     responses:
 *       200: { description: Boutique mise à jour }
 *   put:
 *     tags: [Boutiques]
 *     summary: Remplacement complet du profil boutique (Propriétaire)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Boutique mise à jour }
 */
export const updateMyBoutiqueController = async (req, res, next) => {
  try {
    const result = await updateMyBoutique(req.user?.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique mise à jour avec succès',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/{id}:
 *   get:
 *     tags: [Boutiques]
 *     summary: Récupérer les détails publics d'une boutique par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails publics de la boutique }
 *       404: { description: Boutique introuvable }
 */
export const getBoutiqueByIdController = async (req, res, next) => {
  try {
    const result = await getBoutiqueById(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Détails de la boutique',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /boutiques/{id}:
 *   put:
 *     tags: [Boutiques]
 *     summary: Mettre à jour une boutique spécifique (Admin)
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
 *     responses:
 *       200: { description: Boutique mise à jour par l'admin }
 */
export const updateBoutiqueController = async (req, res, next) => {
  try {
    const result = await updateBoutique(req.params.id, req.user?.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique mise à jour avec succès',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
