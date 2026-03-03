import { helloService } from '../services/index.service.js';
import { apiResponse } from '../utils/response.util.js';

/**
 * @openapi
 * tags:
 *   - name: System
 *     description: Routes système, santé et documentation
 */

/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: Point d'entrée de l'API (Bienvenue)
 *     responses:
 *       200:
 *         description: Message de bienvenue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Hello endpoint" }
 *                 data: { type: string }
 */
export const helloController = async (req, res, next) => {
  try {
    const result = helloService();

    apiResponse({
      req,
      res,
      status: 200,
      message: 'Hello endpoint',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
