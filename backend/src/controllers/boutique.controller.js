import { getMyBoutique, getBoutiqueSalesDashboard } from '../services/boutique.service.js';
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
