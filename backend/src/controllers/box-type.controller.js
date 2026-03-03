import {
  createBoxType,
  listBoxTypes,
  getBoxTypeById,
  updateBoxType,
  deleteBoxType,
} from '../services/box-type.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: BoxTypes
 *     description: Catégories techniques de boxes (ex. Standard, Grand, Réfrigéré)
 */

/**
 * @openapi
 * /box-types:
 *   post:
 *     tags: [BoxTypes]
 *     summary: Créer une nouvelle catégorie de box (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom]
 *             properties:
 *               nom: { type: string, example: "Réfrigéré" }
 *               description: { type: string }
 *               caracteristiques:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nom: { type: string }
 *                     valeur: { type: string }
 *               estActif: { type: boolean, default: true }
 *     responses:
 *       201: { description: Catégorie de box créée }
 */
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

/**
 * @openapi
 * /box-types:
 *   get:
 *     tags: [BoxTypes]
 *     summary: Lister les catégories de box disponibles (Admin/Boutique)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liste des types de boxes paramétrés }
 */
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

/**
 * @openapi
 * /box-types/{id}:
 *   get:
 *     tags: [BoxTypes]
 *     summary: Détails d'une catégorie de box par ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Détails de la catégorie }
 *       404: { description: Non trouvé }
 */
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

/**
 * @openapi
 * /box-types/{id}:
 *   patch:
 *     tags: [BoxTypes]
 *     summary: Modifier une catégorie de box (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom: { type: string }
 *               estActif: { type: boolean }
 *     responses:
 *       200: { description: Catégorie mise à jour }
 */
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

/**
 * @openapi
 * /box-types/{id}:
 *   delete:
 *     tags: [BoxTypes]
 *     summary: Supprimer une catégorie de box (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Type supprimé avec succès }
 *       409: { description: Conflit si le type est utilisé par des boxes existantes }
 */
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
