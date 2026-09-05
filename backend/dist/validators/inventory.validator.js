"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustSchema = exports.transferSchema = exports.pickSchema = exports.inwardSchema = void 0;
const zod_1 = require("zod");
exports.inwardSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, 'productId is required'),
    binId: zod_1.z.string().min(1, 'binId is required'),
    quantity: zod_1.z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
    reason: zod_1.z.string().optional().default('Standard inward receipt'),
});
exports.pickSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1, 'orderId is required'),
    productId: zod_1.z.string().min(1, 'productId is required'),
    binId: zod_1.z.string().min(1, 'binId is required'),
    quantity: zod_1.z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
});
exports.transferSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, 'productId is required'),
    fromBinId: zod_1.z.string().min(1, 'fromBinId is required'),
    toBinId: zod_1.z.string().min(1, 'toBinId is required'),
    quantity: zod_1.z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero'),
    reason: zod_1.z.string().optional().default('Internal warehouse transfer'),
}).refine((data) => data.fromBinId !== data.toBinId, {
    message: 'Source bin and destination bin must be different',
    path: ['toBinId'],
});
exports.adjustSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, 'productId is required'),
    binId: zod_1.z.string().min(1, 'binId is required'),
    quantity: zod_1.z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
    reason: zod_1.z.string().min(3, 'Adjustment reason is required (e.g., Damaged, Cycle Count)'),
});
