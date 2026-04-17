import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        message: 'Welcome to Finvia!',
        timestamp: new Date().toISOString(),
    });
});


export default router;
