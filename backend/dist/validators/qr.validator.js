"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyQrSchema = void 0;
const zod_1 = require("zod");
exports.verifyQrSchema = zod_1.z.object({
    qrCode: zod_1.z.string().min(1, 'qrCode is required').trim(),
    expectedSku: zod_1.z.string().trim().optional(),
    expectedBinCode: zod_1.z.string().trim().optional(),
    expectedBinId: zod_1.z.string().trim().optional(),
    orderId: zod_1.z.string().trim().optional(),
});
