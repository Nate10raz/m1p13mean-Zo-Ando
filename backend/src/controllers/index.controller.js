import { helloService } from '../services/index.service.js';
import { apiResponse } from '../utils/response.util.js';

export const helloController = async (req, res, next) => {
  try {
    const result = helloService();

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Hello endpoint',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
