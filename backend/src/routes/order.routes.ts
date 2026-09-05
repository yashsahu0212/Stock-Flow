import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', OrderController.getAll);
router.get('/:id', OrderController.getById);
router.post('/', optionalAuth, OrderController.create);
router.patch('/:id/status', optionalAuth, OrderController.updateStatus);
router.get('/:id/items', OrderController.getItems);

export default router;
