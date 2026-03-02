import {
  getPanier,
  addToPanier,
  updateItemQuantity,
  removeItem,
  clearPanier,
} from '../services/panier.service.js';
import { apiResponse } from '../utils/response.util.js';

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
