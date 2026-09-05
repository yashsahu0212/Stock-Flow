"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const warehouse_routes_1 = __importDefault(require("./warehouse.routes"));
const bin_routes_1 = __importDefault(require("./bin.routes"));
const inventory_routes_1 = __importDefault(require("./inventory.routes"));
const order_routes_1 = __importDefault(require("./order.routes"));
const qr_routes_1 = __importDefault(require("./qr.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
// Healthcheck
router.get('/health', (_req, res) => {
    (0, response_1.sendSuccess)(res, {
        status: 'UP',
        service: 'StockFlow Inventory & Warehouse Tracking Backend',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});
// Mounted modules
router.use('/auth', auth_routes_1.default);
router.use('/products', product_routes_1.default);
router.use('/warehouses', warehouse_routes_1.default);
router.use('/bins', bin_routes_1.default);
router.use('/inventory', inventory_routes_1.default);
router.use('/orders', order_routes_1.default);
router.use('/qr', qr_routes_1.default);
router.use('/dashboard', dashboard_routes_1.default);
exports.default = router;
