import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import categoryRoutes from './category.routes.js';
import produitRoutes from './produit.routes.js';
import boutiqueRoutes from './boutique.routes.js';
import alerteStockRoutes from './alerte-stock.routes.js';
import notificationRoutes from './notification.routes.js';
import boxTypeRoutes from './box-type.routes.js';
import boxRoutes from './box.routes.js';
import demandeLocationBoxRoutes from './demande-location-box.routes.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Routes systeme et documentation
 */

/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: Endpoint de base
 *     responses:
 *       200: { description: Hello endpoint }
 */
router.get('/', helloController);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/produits', produitRoutes);
router.use('/boutiques', boutiqueRoutes);
router.use('/alertes-stock', alerteStockRoutes);
router.use('/notification', notificationRoutes);
router.use('/box-types', boxTypeRoutes);
router.use('/boxes', boxRoutes);
router.use('/demandes-location-box', demandeLocationBoxRoutes);

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
