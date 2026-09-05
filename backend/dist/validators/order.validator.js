"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatusSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(2, 'Customer name is required'),
    priority: zod_1.z.nativeEnum(client_1.OrderPriority).optional().default(client_1.OrderPriority.NORMAL),
    assignedToUserId: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().min(1, 'productId is required'),
        quantity: zod_1.z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
    })).min(1, 'Order must contain at least one item'),
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.OrderStatus),
});
