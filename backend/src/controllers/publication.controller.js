import publicationService from '../services/publication.service.js';
import { successResponse, errorResponse, badRequestResponse } from '../utils/response.util.js';

class PublicationController {
  /**
   * @openapi
   * /publications:
   *   post:
   *     tags: [Publications]
   *     summary: Créer une publication
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contenu: { type: string }
   *               medias: { type: array, items: { type: string } }
   *     responses:
   *       201: { description: Publication créée }
   */
  async create(req, res) {
    try {
      const { contenu, medias, scheduledAt, expiresAt } = req.body;

      if (!contenu?.trim() && (!medias || medias.length === 0)) {
        return badRequestResponse(req, res, 'La publication doit contenir du texte ou des médias');
      }

      const data = {
        contenu: contenu?.trim(),
        medias: medias || [],
        scheduledAt: scheduledAt || null,
        expiresAt: expiresAt || null,
        roleAuteur: req.user.role,
        boutiqueId: req.user.role === 'boutique' ? req.user.boutiqueId : null,
        adminId: req.user.role === 'admin' ? req.user.id : null,
      };

      const publication = await publicationService.createPublication(data);
      return successResponse(req, res, publication, 'Publication créée avec succès');
    } catch (error) {
      console.error('Publication create error:', error);
      return errorResponse(req, res, error.message);
    }
  }

  async getFeed(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const userId = req.user ? req.user.id : null;

      const publications = await publicationService.getFeed(userId, page, limit, search);
      return successResponse(req, res, publications);
    } catch (error) {
      console.error('Publication feed error:', error);
      return errorResponse(req, res, error.message);
    }
  }

  async markSeen(req, res) {
    try {
      const { id } = req.params;
      await publicationService.markAsSeen(req.user.id, id);
      return successResponse(req, res, null, 'Marquée comme vu');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  async like(req, res) {
    try {
      const { id } = req.params;
      const publication = await publicationService.toggleLike(req.user.id, id);
      return successResponse(req, res, publication);
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { contenu } = req.body;
      if (!contenu?.trim()) {
        return badRequestResponse(req, res, 'Le commentaire ne peut pas être vide');
      }
      const comment = await publicationService.addComment(req.user.id, id, contenu.trim());
      return successResponse(req, res, comment, 'Commentaire ajouté');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  async getComments(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const comments = await publicationService.getComments(id, page);
      return successResponse(req, res, comments);
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await publicationService.deletePublication(id, req.user.id, req.user.role);
      return successResponse(req, res, null, 'Publication supprimée');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }
}

export default new PublicationController();
