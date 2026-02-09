import { registerBoutique, registerClient } from '../services/user.service.js';
import { apiResponse } from '../utils/response.util.js';

export const registerClientController = async (req, res, next) => {
  try {
    const result = await registerClient(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inscription client reussie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const registerBoutiqueController = async (req, res, next) => {
  try {
    const result = await registerBoutique(req.body);
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Inscription boutique reussie',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
