"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
router.get('/summary', dashboard_controller_1.DashboardController.getSummary);
router.get('/low-stock', dashboard_controller_1.DashboardController.getLowStock);
router.get('/recent-movements', dashboard_controller_1.DashboardController.getRecentMovements);
exports.default = router;
