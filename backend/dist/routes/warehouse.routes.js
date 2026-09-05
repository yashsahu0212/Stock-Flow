"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const warehouse_controller_1 = require("../controllers/warehouse.controller");
const router = (0, express_1.Router)();
router.get('/', warehouse_controller_1.WarehouseController.getAll);
router.get('/:id', warehouse_controller_1.WarehouseController.getById);
router.get('/:id/rows', warehouse_controller_1.WarehouseController.getRows);
exports.default = router;
