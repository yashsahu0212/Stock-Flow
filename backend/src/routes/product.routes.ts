import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public / Read-Only queries
router.get('/', ProductController.getAll);
router.get('/search', ProductController.search);
router.get('/sku/:sku', ProductController.getBySku);
router.get('/:id', ProductController.getById);

// Protected mutation endpoints
router.post(
  '/',
  authenticateToken,
  requireRole(Role.ADMIN, Role.MANAGER),
  ProductController.create
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole(Role.ADMIN, Role.MANAGER),
  ProductController.update
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole(Role.ADMIN),
  ProductController.delete
);

export default router;
