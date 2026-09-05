"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Public / Read-Only queries
router.get('/', product_controller_1.ProductController.getAll);
router.get('/search', product_controller_1.ProductController.search);
router.get('/sku/:sku', product_controller_1.ProductController.getBySku);
router.get('/:id', product_controller_1.ProductController.getById);
// Protected mutation endpoints
router.post('/', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)(client_1.Role.ADMIN, client_1.Role.MANAGER), product_controller_1.ProductController.create);
router.patch('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)(client_1.Role.ADMIN, client_1.Role.MANAGER), product_controller_1.ProductController.update);
router.delete('/:id', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)(client_1.Role.ADMIN), product_controller_1.ProductController.delete);
exports.default = router;
