import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import categoryRoutes from './category.routes.js';
import produitRoutes from './produit.routes.js';
import boutiqueRoutes from './boutique.routes.js';
import userRoutes from './user.routes.js';
import alerteStockRoutes from './alerte-stock.routes.js';
import notificationRoutes from './notification.routes.js';
import boxTypeRoutes from './box-type.routes.js';
import boxRoutes from './box.routes.js';
import demandeLocationBoxRoutes from './demande-location-box.routes.js';
import payementBoxRoutes from './payement-box.routes.js';
import uploadRoutes from './upload.routes.js';
import panierRoutes from './panier.routes.js';
import commandeRoutes from './commande.routes.js';
import avisRoutes from './avis.routes.js';
import publicationRoutes from './publication.routes.js';

const router = Router();

router.get('/', helloController);

// Auth & Admin
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/produits', produitRoutes);
router.use('/boutiques', boutiqueRoutes);
router.use('/users', userRoutes);
router.use('/alertes-stock', alerteStockRoutes);
router.use('/notification', notificationRoutes);
router.use('/box-types', boxTypeRoutes);
router.use('/boxes', boxRoutes);
router.use('/demandes-location-box', demandeLocationBoxRoutes);
router.use('/payements-box', payementBoxRoutes);
router.use('/uploads', uploadRoutes);
router.use('/panier', panierRoutes);
router.use('/commande', commandeRoutes);
router.use('/avis', avisRoutes);
router.use('/publications', publicationRoutes);

/**
 * @openapi
 * /api-docs:
 *   get:
 *     tags: [System]
 *     summary: UI Swagger
 *     responses:
 *       200: { description: Swagger UI }
 */

/**
 * @openapi
 * /api-docs.json:
 *   get:
 *     tags: [System]
 *     summary: Specification OpenAPI
 *     responses:
 *       200: { description: OpenAPI JSON }
 */

export default router;
