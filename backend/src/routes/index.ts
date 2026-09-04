import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import warehouseRoutes from './warehouse.routes';
import binRoutes from './bin.routes';
import inventoryRoutes from './inventory.routes';
import orderRoutes from './order.routes';
import qrRoutes from './qr.routes';
import dashboardRoutes from './dashboard.routes';
import { sendSuccess } from '../utils/response';

const router = Router();

// Healthcheck
router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'UP',
    service: 'StockFlow Inventory & Warehouse Tracking Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mounted modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/bins', binRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/qr', qrRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
