import publicationService from '../services/publication.service.js';
import { successResponse, errorResponse, badRequestResponse } from '../utils/response.util.js';

class PublicationController {
  /**
   * @openapi
   * tags:
   *   - name: Publications
   *     description: Gestion du fil d'actualité, likes, commentaires et signalements
   */

  /**
   * @openapi
   * /publications:
   *   post:
   *     tags: [Publications]
   *     summary: Créer une publication (Admin/Boutique)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contenu: { type: string }
   *               medias: { type: array, items: { type: string }, description: "URLs des médias (images/vidéos)" }
   *               scheduledAt: { type: string, format: date-time, description: "Date de publication différée" }
   *               expiresAt: { type: string, format: date-time, description: "Date d'expiration (archivage auto)" }
   *     responses:
   *       201: { description: Publication créée }
   *       400: { description: Contenu ou médias manquants }
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

  /**
   * @openapi
   * /publications:
   *   get:
   *     tags: [Publications]
   *     summary: Obtenir le fil d'actualité (Public/Client)
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *     responses:
   *       200: { description: Liste des publications paginée }
   */
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

  /**
   * @openapi
   * /publications/{id}/seen:
   *   post:
   *     tags: [Publications]
   *     summary: Marquer une publication comme vue (Connecté)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Marquée comme vu }
   *       404: { description: Publication introuvable }
   */
  async markSeen(req, res) {
    try {
      const { id } = req.params;
      await publicationService.markAsSeen(req.user.id, id);
      return successResponse(req, res, null, 'Marquée comme vu');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  /**
   * @openapi
   * /publications/{id}/like:
   *   post:
   *     tags: [Publications]
   *     summary: Liker / Unliker une publication (Connecté)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: État du like mis à jour }
   *       404: { description: Publication introuvable }
   */
  async like(req, res) {
    try {
      const { id } = req.params;
      const publication = await publicationService.toggleLike(req.user.id, id);
      return successResponse(req, res, publication);
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  /**
   * @openapi
   * /publications/{id}/comments:
   *   post:
   *     tags: [Publications]
   *     summary: Ajouter un commentaire (Connecté)
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
   *             required: [contenu]
   *             properties:
   *               contenu: { type: string }
   *     responses:
   *       201: { description: Commentaire ajouté }
   *       400: { description: Contenu vide }
   *       404: { description: Publication introuvable }
   */
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

  /**
   * @openapi
   * /publications/{id}/comments:
   *   get:
   *     tags: [Publications]
   *     summary: Récupérer les commentaires d'une publication
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *     responses:
   *       200: { description: Liste des commentaires paginée }
   */
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

  /**
   * @openapi
   * /publications/{id}:
   *   delete:
   *     tags: [Publications]
   *     summary: Supprimer une publication (Auteur ou Admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Publication supprimée }
   *       403: { description: Action non autorisée }
   *       404: { description: Publication introuvable }
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await publicationService.deletePublication(id, req.user);
      return successResponse(req, res, null, 'Publication supprimée');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  /**
   * @openapi
   * /publications/{id}/report:
   *   post:
   *     tags: [Publications]
   *     summary: Signaler une publication (Client)
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
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *     responses:
   *       200: { description: Publication signalée }
   *       400: { description: Seuls les clients peuvent signaler }
   *       404: { description: Publication introuvable }
   */
  async report(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (req.user.role !== 'client') {
        return badRequestResponse(req, res, 'Seuls les clients peuvent signaler des publications');
      }

      const publication = await publicationService.reportPublication(id, req.user.id, reason);
      return successResponse(req, res, publication, 'Publication signalée');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  /**
   * @openapi
   * /publications/reported:
   *   get:
   *     tags: [Publications]
   *     summary: Obtenir les publications signalées (Admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *     responses:
   *       200: { description: Liste des publications signalées }
   *       403: { description: Accès réservé aux admins }
   */
  async getReported(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return badRequestResponse(req, res, 'Accès réservé aux administrateurs');
      }

      const page = parseInt(req.query.page) || 1;
      const reported = await publicationService.getReportedPublications(page);
      return successResponse(req, res, reported);
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }

  /**
   * @openapi
   * /publications/{id}/dismiss-reports:
   *   patch:
   *     tags: [Publications]
   *     summary: Ignorer les signalements d'une publication (Admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Signalements ignorés }
   *       403: { description: Accès réservé aux admins }
   *       404: { description: Publication introuvable }
   */
  async dismissReports(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return badRequestResponse(req, res, 'Accès réservé aux administrateurs');
      }

      const { id } = req.params;
      await publicationService.dismissReports(id);
      return successResponse(req, res, null, 'Signalements ignorés');
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }
}

export default new PublicationController();
