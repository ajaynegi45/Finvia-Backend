import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic service health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'invoice-backend',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: Database connectivity health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database connection is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/db', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT 1 AS ok');

    res.status(200).json({
      success: true,
      status: 'ok',
      database: result.rows[0].ok === 1 ? 'connected' : 'unknown',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
