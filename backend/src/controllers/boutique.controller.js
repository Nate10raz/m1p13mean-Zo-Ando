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
