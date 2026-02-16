import { getMyBoutique } from '../services/boutique.service.js';
import { apiResponse } from '../utils/response.util.js';

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
