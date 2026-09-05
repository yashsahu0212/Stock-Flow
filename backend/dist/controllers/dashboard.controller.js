"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const response_1 = require("../utils/response");
class DashboardController {
    static async getSummary(_req, res, next) {
        try {
            const summary = await dashboard_service_1.DashboardService.getSummary();
            (0, response_1.sendSuccess)(res, summary);
        }
        catch (err) {
            next(err);
        }
    }
    static async getLowStock(_req, res, next) {
        try {
            const lowStock = await dashboard_service_1.DashboardService.getLowStockProducts();
            (0, response_1.sendSuccess)(res, lowStock);
        }
        catch (err) {
            next(err);
        }
    }
    static async getRecentMovements(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const movements = await dashboard_service_1.DashboardService.getRecentMovements(limit);
            (0, response_1.sendSuccess)(res, movements);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
