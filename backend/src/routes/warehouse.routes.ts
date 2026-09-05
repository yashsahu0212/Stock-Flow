import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', WarehouseController.getAll);
router.get('/:id', WarehouseController.getById);
router.get('/:id/rows', WarehouseController.getRows);

router.post(
  '/',
  authenticateToken,
  requireRole(Role.ADMIN, Role.MANAGER),
  WarehouseController.create
);

export default router;
