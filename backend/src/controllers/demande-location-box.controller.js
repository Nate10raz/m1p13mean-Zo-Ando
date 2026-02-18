import {
  createDemandeLocationBox,
  listDemandesLocationBox,
  listDemandesLocationBoxPending,
  getDemandeLocationBox,
  cancelDemandeLocationBox,
  approveDemandeLocationBox,
  rejectDemandeLocationBox,
  listMyDemandesLocationBox,
} from '../services/demande-location-box.service.js';
import { apiResponse } from '../utils/response.util.js';

export const createDemandeLocationBoxController = async (req, res, next) => {
  try {
    const result = await createDemandeLocationBox(req.body, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 201,
      message: 'Demande de location creee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listDemandesLocationBoxController = async (req, res, next) => {
  try {
    const result = await listDemandesLocationBox(
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
      message: 'Liste des demandes de location',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listMyDemandesLocationBoxController = async (req, res, next) => {
  try {
    const result = await listMyDemandesLocationBox(
      { userId: req.user?.id, role: req.user?.role },
      {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Mes demandes de location',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listDemandesLocationBoxPendingController = async (req, res, next) => {
  try {
    const result = await listDemandesLocationBoxPending(
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
      message: 'Demandes en attente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDemandeLocationBoxController = async (req, res, next) => {
  try {
    const result = await getDemandeLocationBox(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Demande de location',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelDemandeLocationBoxController = async (req, res, next) => {
  try {
    const result = await cancelDemandeLocationBox(req.params.id, {
      userId: req.user?.id,
      role: req.user?.role,
    });
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Demande annulee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const approveDemandeLocationBoxController = async (req, res, next) => {
  try {
    const result = await approveDemandeLocationBox(
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
      message: 'Demande validee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectDemandeLocationBoxController = async (req, res, next) => {
  try {
    const result = await rejectDemandeLocationBox(
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
      message: 'Demande rejetee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
