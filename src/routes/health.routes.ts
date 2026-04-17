import { Router } from 'express';
import { pool } from '../config/db';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'invoice-backend',
    timestamp: new Date().toISOString(),
  });
});

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
