import { Router } from 'express';
import * as commandeController from '../controllers/commande.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(requireAuth);

// Admin routes
router.get('/admin/all', requireRole('admin'), commandeController.getAllCommandes);
router.post('/admin/confirm-depot/:id', requireRole('admin'), commandeController.confirmDepot);
router.post('/admin/mark-delivered/:id', requireRole('admin'), commandeController.markAsDelivered);

// Boutique routes
router.get('/boutique/all', requireRole('boutique'), commandeController.getBoutiqueCommandes);
router.post('/boutique/accept/:id', requireRole('boutique'), commandeController.acceptOrder);
router.post(
  '/boutique/start-delivery/:id',
  requireRole('boutique'),
  commandeController.startBoutiqueDelivery,
);

// Client routes
router.post('/', requireRole('client'), commandeController.createCommande);
router.get('/my', requireRole('client'), commandeController.getMyCommandes);

// Shared / Detail routes
router.get('/:id', commandeController.getCommandeDetails);
router.post('/cancel/:id', commandeController.cancelOrder);
router.post('/cancel-item/:id/:produitId', commandeController.cancelItem);
router.post('/confirm-receipt/:id', commandeController.confirmFinal);

export default router;
