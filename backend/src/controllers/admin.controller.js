import { approveBoutique, listPendingBoutiques } from '../services/admin.service.js';
import { apiResponse } from '../utils/response.util.js';

export const approveBoutiqueController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await approveBoutique(id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique approuvee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingBoutiquesController = async (req, res, next) => {
  try {
    const result = await listPendingBoutiques(req.query);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutiques en attente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
