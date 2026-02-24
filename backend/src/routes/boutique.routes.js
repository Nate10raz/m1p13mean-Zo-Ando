import {
    getMyBoutiqueController,
    updateMyBoutiqueController,
    getBoutiqueByIdController,
    updateBoutiqueController,
} from '../controllers/boutique.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * tags :
 *   - name : Boutiques
 *     description : Gestion des boutiques
 */

router.get('/me', requireAuth, requireRole('boutique'), getMyBoutiqueController);
router.put('/me', requireAuth, requireRole('boutique'), updateMyBoutiqueController);

router.get('/:id', getBoutiqueByIdController);
router.put('/:id', requireAuth, updateBoutiqueController);



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
