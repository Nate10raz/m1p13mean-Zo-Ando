import { Router } from 'express';
import publicationController from '../controllers/publication.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Flux de publications (accessible à tous, mais markSeen et feed personnalisé nécessitent requireAuth si on veut tracker la vue)
// On va faire un middleware optionnel pour l'ID utilisateur si connecté
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireAuth(req, res, next);
  }
  next();
};

/**
 * @openapi
 * tags:
 *   - name: Publications
 *     description: Gestion du fil d'actualité, likes et commentaires
 */

// Obtenir le fil d'actualité (Infinite scroll)
router.get('/', optionalAuth, publicationController.getFeed);

// Créer une publication (Admin et Boutique uniquement)
router.post('/', requireAuth, requireRole('admin', 'boutique'), publicationController.create);

// Marquer comme vu
router.post('/:id/seen', requireAuth, publicationController.markSeen);

// Liker / Unliker
router.post('/:id/like', requireAuth, publicationController.like);

// Ajouter un commentaire
router.post('/:id/comments', requireAuth, publicationController.addComment);

// Récupérer les commentaires
router.get('/:id/comments', publicationController.getComments);

// Supprimer une publication
router.delete('/:id', requireAuth, publicationController.delete);

export default router;
