import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';

const router = Router();

router.get('/:id', WarehouseController.getBin);
router.get('/:id/inventory', WarehouseController.getBinInventory);

export default router;
