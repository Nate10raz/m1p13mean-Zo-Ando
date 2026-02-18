import {
  createAlerteStock,
  listAlerteStock,
  getAlerteStockById,
  updateAlerteStock,
  deleteAlerteStock,
} from '../services/alerte-stock.service.js';
import { apiResponse } from '../utils/response.util.js';

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
