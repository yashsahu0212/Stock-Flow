import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', DashboardController.getSummary);
router.get('/low-stock', DashboardController.getLowStock);
router.get('/recent-movements', DashboardController.getRecentMovements);

export default router;
