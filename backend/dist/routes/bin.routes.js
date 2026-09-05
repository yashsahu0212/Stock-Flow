"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const warehouse_controller_1 = require("../controllers/warehouse.controller");
const router = (0, express_1.Router)();
router.get('/:id', warehouse_controller_1.WarehouseController.getBin);
router.get('/:id/inventory', warehouse_controller_1.WarehouseController.getBinInventory);
exports.default = router;
