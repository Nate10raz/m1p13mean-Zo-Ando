import {
  createBoxType,
  listBoxTypes,
  getBoxTypeById,
  updateBoxType,
  deleteBoxType,
} from '../services/box-type.service.js';
import { apiResponse } from '../utils/response.util.js';

export const createBoxTypeController = async (req, res, next) => {
  try {
    const result = await createBoxType(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'BoxType cree',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listBoxTypesController = async (req, res, next) => {
  try {
    const result = await listBoxTypes(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estActif: req.query.estActif,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des box types',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoxTypeController = async (req, res, next) => {
  try {
    const result = await getBoxTypeById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box type',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoxTypeController = async (req, res, next) => {
  try {
    const result = await updateBoxType(req.params.id, req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box type mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoxTypeController = async (req, res, next) => {
  try {
    const result = await deleteBoxType(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box type supprime',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
