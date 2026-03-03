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

/**
 * @openapi
 * tags:
 *   - name: DemandesLocationBox
 *     description: Gestion contractuelle des locations de boxes
 */

/**
 * @openapi
 * /demandes-location-box:
 *   post:
 *     tags: [DemandesLocationBox]
 *     summary: Soumettre une demande de location pour une box (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boxId, dateDebut]
 *             properties:
 *               boxId: { type: string, description: "ID de la box ciblée" }
 *               dateDebut: { type: string, format: date, description: "Date souhaitée pour le début du contrat" }
 *     responses:
 *       201: { description: Demande transmise à l'administration }
 */
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

/**
 * @openapi
 * /demandes-location-box:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Lister les demandes de location avec filtres (Admin/Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, validee, rejetee, annulee] }
 *       - in: query
 *         name: boxId
 *         schema: { type: string }
 *       - in: query
 *         name: boutiqueId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Liste filtrée des demandes }
 */
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

/**
 * @openapi
 * /demandes-location-box/me:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Voir mes demandes de location personnelles (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, validee, rejetee, annulee] }
 *     responses:
 *       200: { description: Mes demandes avec leur état actuel }
 */
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

/**
 * @openapi
 * /demandes-location-box/pending:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Lister les demandes nécessitant une validation (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Queue des demandes en attente de traitement }
 */
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

/**
 * @openapi
 * /demandes-location-box/{id}:
 *   get:
 *     tags: [DemandesLocationBox]
 *     summary: Consulter une demande de location par ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails de la demande et du box associé }
 */
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

/**
 * @openapi
 * /demandes-location-box/{id}/cancel:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Retirer une demande de location (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Demande marquée comme annulée }
 */
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

/**
 * @openapi
 * /demandes-location-box/{id}/approve:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Valider une demande et générer le contrat/location (Admin)
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
 *             required: [commentaire]
 *             properties:
 *               commentaire: { type: string, example: "Demande conforme aux critères." }
 *     responses:
 *       200: { description: Demande validée et box assigné }
 */
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

/**
 * @openapi
 * /demandes-location-box/{id}/reject:
 *   patch:
 *     tags: [DemandesLocationBox]
 *     summary: Refuser une demande de location (Admin)
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
 *             required: [commentaire]
 *             properties:
 *               commentaire: { type: string, example: "Box réservé par un autre utilisateur." }
 *     responses:
 *       200: { description: Demande rejetée avec motif }
 */
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
