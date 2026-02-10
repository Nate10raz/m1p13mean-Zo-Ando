import { apiResponse, errorResponse } from '../utils/response.util.js';

export const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err.status) {
    return apiResponse({
      req,
      res,
      status: err.status,
      message: err.message || 'Error',
      data: err.data || null,
    });
  }

  return errorResponse(req, res, err.message || 'Internal server error', err.data || null);
};
