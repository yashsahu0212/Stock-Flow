"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../services/order.service");
const order_validator_1 = require("../validators/order.validator");
const response_1 = require("../utils/response");
class OrderController {
    static async getAll(req, res, next) {
        try {
            const status = req.query.status;
            const priority = req.query.priority;
            const orders = await order_service_1.OrderService.getAllOrders({ status, priority });
            (0, response_1.sendSuccess)(res, orders);
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const order = await order_service_1.OrderService.getOrderById(req.params.id);
            (0, response_1.sendSuccess)(res, order);
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const validated = order_validator_1.createOrderSchema.parse(req.body);
            const order = await order_service_1.OrderService.createOrder(validated);
            (0, response_1.sendSuccess)(res, order, 201, 'Order created successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const validated = order_validator_1.updateOrderStatusSchema.parse(req.body);
            const updated = await order_service_1.OrderService.updateOrderStatus(req.params.id, validated.status);
            (0, response_1.sendSuccess)(res, updated, 200, 'Order status updated successfully');
        }
        catch (err) {
            next(err);
        }
    }
    static async getItems(req, res, next) {
        try {
            const items = await order_service_1.OrderService.getOrderItems(req.params.id);
            (0, response_1.sendSuccess)(res, items);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.OrderController = OrderController;
