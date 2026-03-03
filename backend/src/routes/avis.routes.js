import { Router } from 'express';
import {
  createAvis,
  getAvisByEntity,
  respondToAvis,
  reportAvis,
  getSignaledAvis,
  adminActionOnReport,
} from '../controllers/avis.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// Créer un avis (Clients uniquement)
router.post('/', requireAuth, requireRole('client'), createAvis);

// Répondre à un avis (Admin ou Boutique)
router.post('/:avisId/reponse', requireAuth, requireRole('admin', 'boutique'), respondToAvis);

// Signaler un avis (Tout le monde connecté)
router.post('/:avisId/signalement', requireAuth, reportAvis);

// --- Routes Admin ---

// Récupérer les avis signalés
router.get('/admin/signales', requireAuth, requireRole('admin'), getSignaledAvis);

// Agir sur un signalement
router.patch('/admin/:avisId/signalement', requireAuth, requireRole('admin'), adminActionOnReport);

// Récupérer les avis d'un produit ou d'une boutique (Public)
router.get('/:type/:id', getAvisByEntity);

export default router;
