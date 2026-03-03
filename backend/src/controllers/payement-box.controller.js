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

/**
 * @openapi
 * tags:
 *   - name: PayementsBox
 *     description: Suivi financier des locations de boxes
 */

/**
 * @openapi
 * /payements-box:
 *   post:
 *     tags: [PayementsBox]
 *     summary: Enregistrer un nouveau règlement (Boutique/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [boxId, montant]
 *             properties:
 *               boxId: { type: string, description: "Box concernée par le paiement" }
 *               montant: { type: number, minimum: 0, example: 50000 }
 *               prixBoxeId: { type: string, description: "ID du tarif appliqué" }
 *               date: { type: string, format: date, description: "Date effective du paiement" }
 *               dueDate: { type: string, format: date, description: "Date d'échéance prévue" }
 *               periode: { type: string, example: "2026-02", description: "Mois et année du loyer" }
 *               status: { type: string, enum: [en_attente, valide, rejete], default: en_attente }
 *               commentaire: { type: string, example: "Paiement via Wave" }
 *     responses:
 *       201: { description: Paiement soumis pour validation }
 */
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

/**
 * @openapi
 * /payements-box:
 *   get:
 *     tags: [PayementsBox]
 *     summary: Lister les transactions avec filtres (Admin/Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [en_attente, valide, rejete] }
 *       - in: query
 *         name: boxId
 *         schema: { type: string }
 *       - in: query
 *         name: boutiqueId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Historique des paiements filtré }
 */
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

/**
 * @openapi
 * /payements-box/pending:
 *   get:
 *     tags: [PayementsBox]
 *     summary: Voir les paiements à confirmer par la comptabilité (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Queue des encaissements en attente }
 */
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

/**
 * @openapi
 * /payements-box/{id}:
 *   get:
 *     tags: [PayementsBox]
 *     summary: Consulter un reçu de paiement spécifique
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails de la transaction }
 */
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

/**
 * @openapi
 * /payements-box/{id}:
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Modifier une transaction existante
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               montant: { type: number, minimum: 0 }
 *               periode: { type: string, example: "2026-03" }
 *               commentaire: { type: string }
 *     responses:
 *       200: { description: Transaction mise à jour }
 */
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

/**
 * @openapi
 * /payements-box/{id}:
 *   delete:
 *     tags: [PayementsBox]
 *     summary: Annuler et supprimer un enregistrement de paiement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paiement supprimé }
 */
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

/**
 * @openapi
 * /payements-box/{id}/validate:
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Confirmer l'encaissement définitif (Admin)
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
 *               commentaire: { type: string, example: "Fonds reçus en banque." }
 *     responses:
 *       200: { description: Paiement marqué comme validé }
 */
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

/**
 * @openapi
 * /payements-box/{id}/reject:
 *   patch:
 *     tags: [PayementsBox]
 *     summary: Rejeter une transaction (Admin)
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
 *               commentaire: { type: string, example: "Preuve de virement illisible." }
 *     responses:
 *       200: { description: Paiement rejeté }
 */
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
