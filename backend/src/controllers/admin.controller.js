import {
  approveBoutique,
  listBoutiques,
  listPendingBoutiques,
  reactivateBoutique,
  rejectBoutique,
  suspendBoutique,
  reactivateUser,
  suspendUser,
  listClients,
} from '../services/admin.service.js';
import { apiResponse } from '../utils/response.util.js';

export const approveBoutiqueController = async (req, res, next) => {
  try {
    const result = await approveBoutique(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique approuvee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const suspendBoutiqueController = async (req, res, next) => {
  try {
    const result = await suspendBoutique(req.params.id, req.body.motif);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique suspendue',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectBoutiqueController = async (req, res, next) => {
  try {
    const result = await rejectBoutique(req.params.id, req.body.motif);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique rejetee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reactivateBoutiqueController = async (req, res, next) => {
  try {
    const result = await reactivateBoutique(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutique reactivee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingBoutiquesController = async (req, res, next) => {
  try {
    const result = await listPendingBoutiques(req.query);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Boutiques en attente',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listBoutiquesController = async (req, res, next) => {
  try {
    const result = await listBoutiques(req.query);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste boutiques',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUserController = async (req, res, next) => {
  try {
    const result = await suspendUser(req.params.id, req.body.motif);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Utilisateur suspendu',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reactivateUserController = async (req, res, next) => {
  try {
    const result = await reactivateUser(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Utilisateur reactive',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listClientsController = async (req, res, next) => {
  try {
    const result = await listClients(req.query);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Liste clients',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
