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

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Opérations d'administration globale (Boutiques, Utilisateurs, Finance, Paramétrage)
 */

/**
 * @openapi
 * /admin/boutiques/{id}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approuver une demande d'inscription d'une boutique (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Boutique approuvée avec succès }
 *       403: { description: Réservé aux admins }
 *       404: { description: Boutique introuvable }
 */
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

/**
 * @openapi
 * /admin/boutiques/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspendre une boutique active (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motif]
 *             properties:
 *               motif: { type: string, description: "Raison de la suspension" }
 *     responses:
 *       200: { description: Boutique suspendue }
 *       403: { description: Réservé aux admins }
 */
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

/**
 * @openapi
 * /admin/boutiques/{id}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Rejeter une demande d'inscription d'une boutique (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motif]
 *             properties:
 *               motif: { type: string, description: "Raison du rejet" }
 *     responses:
 *       200: { description: Boutique rejetée }
 *       403: { description: Réservé aux admins }
 */
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

/**
 * @openapi
 * /admin/boutiques/{id}/reactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Réactiver une boutique suspendue (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Boutique réactivée }
 *       403: { description: Réservé aux admins }
 */
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

/**
 * @openapi
 * /admin/boutiques/pending:
 *   get:
 *     tags: [Admin]
 *     summary: Lister les boutiques en attente d'approbation (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Liste des boutiques en attente }
 */
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

/**
 * @openapi
 * /admin/boutiques:
 *   get:
 *     tags: [Admin]
 *     summary: Lister toutes les boutiques avec filtres (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspendue, en_attente, rejetee] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       200: { description: Liste des boutiques }
 */
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

/**
 * @openapi
 * /admin/users/{id}/suspend:
 *   patch:
 *     tags: [Admin]
 *     summary: Suspendre un utilisateur (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motif]
 *             properties:
 *               motif: { type: string }
 *     responses:
 *       200: { description: Utilisateur suspendu }
 */
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

/**
 * @openapi
 * /admin/users/{id}/reactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Réactiver un utilisateur suspendu (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Utilisateur réactivé }
 */
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

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Lister tous les utilisateurs / clients (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, suspendue] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200: { description: Liste des utilisateurs }
 */
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

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Détails d'un utilisateur par ID (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails de l'utilisateur }
 *       404: { description: Utilisateur introuvable }
 */
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

/**
 * @openapi
 * /admin/users/{id}/password:
 *   patch:
 *     tags: [Admin]
 *     summary: Forcer ou réinitialiser le mot de passe d'un utilisateur (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Mot de passe mis à jour ou lien envoyé }
 */
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

/**
 * @openapi
 * /admin/dashboard/finance:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard financier global (Admin)
 *     description: KPI, revenus totaux, commissions et statistiques boutiques.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Données financières }
 */
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

/**
 * @openapi
 * /admin/frais-livraison-supermarche:
 *   get:
 *     tags: [Admin]
 *     summary: Obtenir les frais de livraison supermarché actuels (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Frais actuels }
 */
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

/**
 * @openapi
 * /admin/frais-livraison-supermarche:
 *   post:
 *     tags: [Admin]
 *     summary: Configurer les frais de livraison supermarché (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [montant]
 *             properties:
 *               montant: { type: number, example: 500 }
 *               type: { type: string, enum: [fixe, pourcentage], default: fixe }
 *               description: { type: string }
 *     responses:
 *       200: { description: Frais configurés }
 */
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

/**
 * @openapi
 * /admin/frais-livraison-supermarche/history:
 *   get:
 *     tags: [Admin]
 *     summary: Historique des modifications des frais de livraison (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste historique }
 */
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
