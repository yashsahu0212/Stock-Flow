import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';

const router = Router();

router.get('/', WarehouseController.getAll);
router.get('/:id', WarehouseController.getById);
router.get('/:id/rows', WarehouseController.getRows);

export default router;
