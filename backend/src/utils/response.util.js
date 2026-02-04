// src/utils/response.util.js

export const apiResponse = ({
                                req,
                                res,
                                status = 200,
                                message = 'Success',
                                data = null
                            }) => {
    return res.status(status).json({
        route: req.originalUrl,
        status,
        message,
        date: new Date(),
        data
    });
};

// ------------------------
// Réponses génériques
// ------------------------

export const successResponse = (req, res, data = null, message = 'Success') => {
    return apiResponse({ req, res, status: 200, message, data });
};

export const notFoundResponse = (req, res, message = 'Resource not found') => {
    return apiResponse({ req, res, status: 404, message, data: null });
};

export const badRequestResponse = (req, res, message = 'Bad request', data = null) => {
    return apiResponse({ req, res, status: 400, message, data });
};

export const forbiddenResponse = (req, res, message = 'Forbidden') => {
    return apiResponse({ req, res, status: 403, message, data: null });
};

export const errorResponse = (req, res, message = 'Internal server error', data = null) => {
    return apiResponse({ req, res, status: 500, message, data });
};
