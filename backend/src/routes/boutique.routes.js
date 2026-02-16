import { Router } from 'express';
import { getMyBoutiqueController } from '../controllers/boutique.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * tags :
 *   - name : Boutiques
 *     description : Gestion des boutiques
 */

router.get('/me', requireAuth, requireRole('boutique'), getMyBoutiqueController);

/**
 * @openapi
 * /boutiques/me:
 *   get:
 *     tags: [Boutiques]
 *     summary: Recuperer la boutique de l'utilisateur connecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Boutique }
 *       403: { description: Forbidden }
 *       404: { description: Boutique introuvable }
 */

export default router;
