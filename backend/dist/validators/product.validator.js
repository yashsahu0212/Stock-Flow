"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    sku: zod_1.z.string().min(2, 'SKU must be at least 2 characters').toUpperCase().trim(),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').trim(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0, 'Price must be positive or zero').optional().default(0),
    minStockLevel: zod_1.z.number().int().min(0, 'minStockLevel must be a non-negative integer').optional().default(10),
    unit: zod_1.z.string().optional().default('pcs'),
    barcode: zod_1.z.string().optional(),
});
exports.updateProductSchema = exports.createProductSchema.partial();
