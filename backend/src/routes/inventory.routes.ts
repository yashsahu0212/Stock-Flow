import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', InventoryController.getAll);
router.get('/product/:productId', InventoryController.getByProduct);
router.get('/bin/:binId', InventoryController.getByBin);

router.post('/inward', optionalAuth, InventoryController.inward);
router.post('/pick', optionalAuth, InventoryController.pick);
router.post('/transfer', optionalAuth, InventoryController.transfer);
router.post('/adjust', optionalAuth, InventoryController.adjust);

export default router;
