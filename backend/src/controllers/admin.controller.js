import {
  approveBoutique,
  listBoutiques,
  listPendingBoutiques,
  reactivateBoutique,
  rejectBoutique,
  suspendBoutique,
  reactivateUser,
  suspendUser,
  getUserById,
  listClients,
  getAdminFinanceDashboard,
  getFraisLivraisonSupermarche,
  updateFraisLivraisonSupermarche,
  getFraisLivraisonHistory,
  resetUserPassword,
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

export const getUserByIdController = async (req, res, next) => {
  try {
    const result = await getUserById(req.params.id);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Detail utilisateur',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetUserPasswordController = async (req, res, next) => {
  try {
    const result = await resetUserPassword(req.params.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Lien de reinitialisation envoye',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminFinanceDashboardController = async (req, res, next) => {
  try {
    const result = await getAdminFinanceDashboard(
      {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        topN: req.query.topN,
      },
      {
        userId: req.user?.id,
        role: req.user?.role,
      },
    );
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Dashboard financier admin',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getFraisLivraisonSupermarcheController = async (req, res, next) => {
  try {
    const result = await getFraisLivraisonSupermarche();
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Frais livraison supermarche actuel',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFraisLivraisonSupermarcheController = async (req, res, next) => {
  try {
    const result = await updateFraisLivraisonSupermarche(req.user.id, req.body);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Frais livraison supermarche mis à jour',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getFraisLivraisonHistoryController = async (req, res, next) => {
  try {
    const result = await getFraisLivraisonHistory(req.query);
    apiResponse({
      req,
      res,
      status: 200,
      message: 'Historique des frais livraison supermarche',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
