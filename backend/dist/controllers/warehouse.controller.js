"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseController = void 0;
const warehouse_service_1 = require("../services/warehouse.service");
const response_1 = require("../utils/response");
class WarehouseController {
    static async create(req, res, next) {
        try {
            const warehouse = await warehouse_service_1.WarehouseService.createWarehouse(req.body);
            (0, response_1.sendSuccess)(res, warehouse, 201, 'Warehouse created successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getAll(_req, res, next) {
        try {
            const warehouses = await warehouse_service_1.WarehouseService.getAllWarehouses();
            (0, response_1.sendSuccess)(res, warehouses);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const warehouse = await warehouse_service_1.WarehouseService.getWarehouseById(req.params.id);
            (0, response_1.sendSuccess)(res, warehouse);
        }
        catch (err) {
            next(err);
        }
    }
    static async getRows(req, res, next) {
        try {
            const hierarchy = await warehouse_service_1.WarehouseService.getWarehouseHierarchy(req.params.id);
            (0, response_1.sendSuccess)(res, hierarchy);
        }
        catch (err) {
            next(err);
        }
    }
    static async getBin(req, res, next) {
        try {
            const bin = await warehouse_service_1.WarehouseService.getBinById(req.params.id);
            (0, response_1.sendSuccess)(res, bin);
        }
        catch (err) {
            next(err);
        }
    }
    static async getBinInventory(req, res, next) {
        try {
            const inventory = await warehouse_service_1.WarehouseService.getBinInventory(req.params.id);
            (0, response_1.sendSuccess)(res, inventory);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.WarehouseController = WarehouseController;
