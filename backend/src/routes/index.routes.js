import { Router } from 'express';
import { helloController } from '../controllers/index.controller.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

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
