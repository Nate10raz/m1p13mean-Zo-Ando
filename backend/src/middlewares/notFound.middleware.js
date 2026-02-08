import { notFoundResponse } from '../utils/response.util.js';

export const notFoundMiddleware = (req, res, next) => {
  notFoundResponse(req, res, `Route ${req.originalUrl} not found`);
};
