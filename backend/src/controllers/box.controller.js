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

/**
 * @openapi
 * tags:
 *   - name: Boxes
 *     description: Gestion des emplacements de stockage physique (Boxes)
 */

/**
 * @openapi
 * /boxes:
 *   post:
 *     tags: [Boxes]
 *     summary: Créer un nouvel emplacement de stockage (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numero, etage, zone, superficie, typeId, montant, unite, dateDebut]
 *             properties:
 *               numero: { type: string, example: "A-123" }
 *               etage: { type: integer, example: 0 }
 *               zone: { type: string, example: "Zone Nord" }
 *               allee: { type: string }
 *               position: { type: string }
 *               description: { type: string }
 *               superficie: { type: number, minimum: 0, example: 10.5 }
 *               typeId: { type: string, description: "ID de la catégorie de box (BoxType)" }
 *               montant: { type: number, minimum: 0, description: "Tarif initial" }
 *               unite: { type: string, enum: [mois, annee], default: mois }
 *               dateDebut: { type: string, format: date, description: "Date d'application du tarif" }
 *               raison: { type: string, description: "Motif de création ou du tarif" }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               photos:
 *                 type: array
 *                 items: { type: string, description: "URLs des photos" }
 *     responses:
 *       201: { description: Box créée avec succès }
 */
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

/**
 * @openapi
 * /boxes/{id}/tarif:
 *   patch:
 *     tags: [Boxes]
 *     summary: Mettre à jour la tarification d'une box (Admin)
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
 *             required: [montant, unite, dateDebut]
 *             properties:
 *               montant: { type: number, minimum: 0 }
 *               unite: { type: string, enum: [mois, annee] }
 *               dateDebut: { type: string, format: date }
 *               raison: { type: string }
 *     responses:
 *       200: { description: Nouveau tarif enregistré }
 *       404: { description: Box introuvable }
 */
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

/**
 * @openapi
 * /boxes:
 *   get:
 *     tags: [Boxes]
 *     summary: Lister tous les boxes (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: etage
 *         schema: { type: integer }
 *       - in: query
 *         name: typeId
 *         schema: { type: string }
 *       - in: query
 *         name: estOccupe
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Liste paginée des boxes }
 */
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

/**
 * @openapi
 * /boxes/available:
 *   get:
 *     tags: [Boxes]
 *     summary: Lister les boxes libres pour location (Boutique)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: etage
 *         schema: { type: integer }
 *       - in: query
 *         name: typeId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Liste des boxes n'étant pas occupées }
 */
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

/**
 * @openapi
 * /boxes/me:
 *   get:
 *     tags: [Boxes]
 *     summary: Lister les boxes actuellement louées par ma boutique
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Liste de mes emplacements loués }
 */
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

/**
 * @openapi
 * /boxes/{id}:
 *   get:
 *     tags: [Boxes]
 *     summary: Détails d'une box spécifique par ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails complets de la box }
 *       404: { description: Box introuvable }
 */
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

/**
 * @openapi
 * /boxes/{id}:
 *   patch:
 *     tags: [Boxes]
 *     summary: Modifier les informations techniques d'une box (Admin)
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
 *               numero: { type: string }
 *               etage: { type: integer }
 *               zone: { type: string }
 *               allee: { type: string }
 *               position: { type: string }
 *               description: { type: string }
 *               superficie: { type: number, minimum: 0 }
 *               typeId: { type: string }
 *               estOccupe: { type: boolean }
 *     responses:
 *       200: { description: Box mise à jour }
 */
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

/**
 * @openapi
 * /boxes/{id}:
 *   delete:
 *     tags: [Boxes]
 *     summary: Supprimer une box du système (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Box supprimée avec succès }
 *       409: { description: Impossible de supprimer une box occupée }
 */
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
