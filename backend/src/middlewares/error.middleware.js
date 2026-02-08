import { errorResponse } from '../utils/response.util.js';

export const errorMiddleware = (err, req, res, next) => {
  console.error(err); // log pour debug

  errorResponse(req, res, err.message || 'Internal server error', err.data || null);
};
