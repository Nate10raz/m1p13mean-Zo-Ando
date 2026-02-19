import {
  createPayementBox,
  listPayementBoxes,
  getPayementBoxById,
  updatePayementBox,
  deletePayementBox,
  listPayementBoxesPending,
  validatePayementBox,
  rejectPayementBox,
} from '../services/payement-box.service.js';
import { apiResponse } from '../utils/response.util.js';

export const createPayementBoxController = async (req, res, next) => {
  try {
    const result = await createPayementBox(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Payement box cree',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listPayementBoxesController = async (req, res, next) => {
  try {
    const result = await listPayementBoxes(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        boxId: req.query.boxId,
        boutiqueId: req.query.boutiqueId,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des payements box',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listPayementBoxesPendingController = async (req, res, next) => {
  try {
    const result = await listPayementBoxesPending(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payements en attente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPayementBoxController = async (req, res, next) => {
  try {
    const result = await getPayementBoxById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payement box',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayementBoxController = async (req, res, next) => {
  try {
    const result = await updatePayementBox(req.params.id, req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payement box mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayementBoxController = async (req, res, next) => {
  try {
    const result = await deletePayementBox(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payement box supprime',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const validatePayementBoxController = async (req, res, next) => {
  try {
    const result = await validatePayementBox(
      req.params.id,
      { commentaire: req.body.commentaire },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payement valide',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectPayementBoxController = async (req, res, next) => {
  try {
    const result = await rejectPayementBox(
      req.params.id,
      { commentaire: req.body.commentaire },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Payement rejete',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
