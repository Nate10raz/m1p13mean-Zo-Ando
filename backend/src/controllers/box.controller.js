import {
  updateBoxTarif,
  listBoxes,
  getBoxById,
  updateBox,
  deleteBox,
  listAvailableBoxesForBoutique,
  listBoxesForBoutique,
} from '../services/box.service.js';
import { createBox } from '../services/box-create.service.js';
import { apiResponse } from '../utils/response.util.js';

export const createBoxController = async (req, res, next) => {
  try {
    const result = await createBox(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Box creee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoxTarifController = async (req, res, next) => {
  try {
    const result = await updateBoxTarif(req.params.id, req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Tarif box mis a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listBoxesController = async (req, res, next) => {
  try {
    const result = await listBoxes(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estOccupe: req.query.estOccupe,
        zone: req.query.zone,
        etage: req.query.etage,
        typeId: req.query.typeId,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des boxes',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listAvailableBoxesController = async (req, res, next) => {
  try {
    const result = await listAvailableBoxesForBoutique(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        zone: req.query.zone,
        etage: req.query.etage,
        typeId: req.query.typeId,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste des boxes disponibles',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listMyBoxesController = async (req, res, next) => {
  try {
    const result = await listBoxesForBoutique(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estOccupe: req.query.estOccupe,
        zone: req.query.zone,
        etage: req.query.etage,
        typeId: req.query.typeId,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Mes boxes',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoxController = async (req, res, next) => {
  try {
    const result = await getBoxById(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoxController = async (req, res, next) => {
  try {
    const result = await updateBox(req.params.id, req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box mise a jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoxController = async (req, res, next) => {
  try {
    const result = await deleteBox(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Box supprimee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
