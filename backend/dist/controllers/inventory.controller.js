"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../services/inventory.service");
const inventory_validator_1 = require("../validators/inventory.validator");
const response_1 = require("../utils/response");
class InventoryController {
    static async getAll(req, res, next) {
        try {
            const productId = req.query.productId;
            const binId = req.query.binId;
            const warehouseId = req.query.warehouseId;
            const records = await inventory_service_1.InventoryService.getAllInventory({ productId, binId, warehouseId });
            (0, response_1.sendSuccess)(res, records);
        }
        catch (err) {
            next(err);
        }
    }
    static async getByProduct(req, res, next) {
        try {
            const data = await inventory_service_1.InventoryService.getInventoryByProduct(req.params.productId);
            (0, response_1.sendSuccess)(res, data);
        }
        catch (err) {
            next(err);
        }
    }
    static async getByBin(req, res, next) {
        try {
            const data = await inventory_service_1.InventoryService.getInventoryByBin(req.params.binId);
            (0, response_1.sendSuccess)(res, data);
        }
        catch (err) {
            next(err);
        }
    }
    static async inward(req, res, next) {
        try {
            const validated = inventory_validator_1.inwardSchema.parse(req.body);
            const result = await inventory_service_1.InventoryService.inward(validated, req.user?.userId);
            (0, response_1.sendSuccess)(res, result, 201, 'Stock inward recorded successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async pick(req, res, next) {
        try {
            const validated = inventory_validator_1.pickSchema.parse(req.body);
            const result = await inventory_service_1.InventoryService.pick(validated, req.user?.userId);
            (0, response_1.sendSuccess)(res, result, 200, 'Pick operation completed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async transfer(req, res, next) {
        try {
            const validated = inventory_validator_1.transferSchema.parse(req.body);
            const result = await inventory_service_1.InventoryService.transfer(validated, req.user?.userId);
            (0, response_1.sendSuccess)(res, result, 200, 'Stock transfer completed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async adjust(req, res, next) {
        try {
            const validated = inventory_validator_1.adjustSchema.parse(req.body);
            const result = await inventory_service_1.InventoryService.adjust(validated, req.user?.userId);
            (0, response_1.sendSuccess)(res, result, 200, 'Inventory adjustment recorded successfully');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.InventoryController = InventoryController;
