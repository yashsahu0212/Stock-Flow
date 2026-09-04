import { Router } from 'express';
import { QrController } from '../controllers/qr.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/verify', optionalAuth, QrController.verify);

export default router;
