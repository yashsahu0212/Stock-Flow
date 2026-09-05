"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrService = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
class QrService {
    static async verifyQr(input, userId) {
        const rawQr = input.qrCode.trim();
        // 1. Try finding Product matching QR or SKU
        // Support: "SKU-LOG-G502", "LOG-G502", or exact qrCode column match
        let product = await db_1.default.product.findFirst({
            where: {
                OR: [
                    { qrCode: rawQr },
                    { sku: rawQr },
                    { sku: rawQr.replace(/^SKU-/i, '') },
                    { barcode: rawQr },
                ],
            },
            include: {
                inventories: {
                    include: {
                        bin: {
                            include: {
                                row: {
                                    include: {
                                        warehouse: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { quantity: 'desc' },
                },
            },
        });
        // 2. Try finding ShelfBin matching QR or Code
        let shelfBin = null;
        if (!product) {
            shelfBin = await db_1.default.shelfBin.findFirst({
                where: {
                    OR: [
                        { qrCode: rawQr },
                        { code: rawQr },
                        { code: rawQr.replace(/^SHELF-/i, '').replace(/^BIN-/i, '') },
                        { qrCode: { contains: rawQr, mode: 'insensitive' } },
                    ],
                },
                include: {
                    row: {
                        include: {
                            warehouse: true,
                        },
                    },
                    inventories: {
                        include: {
                            product: true,
                        },
                    },
                },
            });
        }
        // CASE A: Neither Product nor ShelfBin found
        if (!product && !shelfBin) {
            await db_1.default.scanEvent.create({
                data: {
                    qrCode: rawQr,
                    scannedType: client_1.ScanType.UNKNOWN,
                    expectedSku: input.expectedSku,
                    expectedBinCode: input.expectedBinCode,
                    verified: false,
                    reason: client_1.ScanResult.INVALID_QR,
                    userId,
                    metadata: 'QR code not found in products or bins',
                },
            });
            return {
                verified: false,
                reason: 'INVALID_QR',
                message: 'QR code is not registered',
            };
        }
        // CASE B: Product QR Scanned
        if (product) {
            // If expectedSku was specified, check for SKU match
            if (input.expectedSku) {
                const expectedUpper = input.expectedSku.toUpperCase();
                const scannedUpper = product.sku.toUpperCase();
                if (scannedUpper !== expectedUpper) {
                    await db_1.default.scanEvent.create({
                        data: {
                            qrCode: rawQr,
                            scannedType: client_1.ScanType.PRODUCT,
                            expectedSku: input.expectedSku,
                            scannedSku: product.sku,
                            verified: false,
                            reason: client_1.ScanResult.WRONG_PRODUCT,
                            userId,
                            metadata: `Scanned ${product.sku} instead of ${input.expectedSku}`,
                        },
                    });
                    return {
                        verified: false,
                        reason: 'WRONG_PRODUCT',
                        expectedSku: input.expectedSku,
                        scannedSku: product.sku,
                        message: 'Wrong product scanned',
                    };
                }
            }
            // Successful Product Verification Match
            const topInventory = product.inventories[0];
            const totalAvailable = product.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
            const location = topInventory
                ? {
                    binId: topInventory.bin.id,
                    warehouse: topInventory.bin.row.warehouse.code,
                    warehouseName: topInventory.bin.row.warehouse.name,
                    row: topInventory.bin.row.code,
                    shelf: topInventory.bin.code,
                    binQrCode: topInventory.bin.qrCode,
                    quantity: topInventory.quantity,
                }
                : null;
            await db_1.default.scanEvent.create({
                data: {
                    qrCode: rawQr,
                    scannedType: client_1.ScanType.PRODUCT,
                    expectedSku: input.expectedSku || product.sku,
                    scannedSku: product.sku,
                    verified: true,
                    reason: client_1.ScanResult.MATCH,
                    userId,
                },
            });
            return {
                verified: true,
                reason: 'MATCH',
                product: {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                    category: product.category,
                },
                location,
                availableQuantity: totalAvailable,
                locations: product.inventories.map((inv) => ({
                    binId: inv.bin.id,
                    warehouse: inv.bin.row.warehouse.code,
                    row: inv.bin.row.code,
                    shelf: inv.bin.code,
                    quantity: inv.quantity,
                })),
            };
        }
        // CASE C: Shelf/Bin QR Scanned
        if (shelfBin) {
            if (input.expectedBinCode || input.expectedBinId) {
                const matchesCode = !input.expectedBinCode ||
                    shelfBin.code.toUpperCase() === input.expectedBinCode.toUpperCase() ||
                    shelfBin.qrCode.toUpperCase().includes(input.expectedBinCode.toUpperCase());
                const matchesId = !input.expectedBinId || shelfBin.id === input.expectedBinId;
                if (!matchesCode || !matchesId) {
                    await db_1.default.scanEvent.create({
                        data: {
                            qrCode: rawQr,
                            scannedType: client_1.ScanType.SHELF_BIN,
                            expectedBinCode: input.expectedBinCode,
                            scannedBinCode: shelfBin.code,
                            verified: false,
                            reason: client_1.ScanResult.WRONG_LOCATION,
                            userId,
                            metadata: `Scanned bin ${shelfBin.code} instead of expected ${input.expectedBinCode}`,
                        },
                    });
                    return {
                        verified: false,
                        reason: 'WRONG_LOCATION',
                        expectedBinCode: input.expectedBinCode,
                        scannedBinCode: shelfBin.code,
                        message: 'Wrong location/shelf scanned',
                    };
                }
            }
            const totalQuantity = shelfBin.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
            await db_1.default.scanEvent.create({
                data: {
                    qrCode: rawQr,
                    scannedType: client_1.ScanType.SHELF_BIN,
                    expectedBinCode: input.expectedBinCode || shelfBin.code,
                    scannedBinCode: shelfBin.code,
                    verified: true,
                    reason: client_1.ScanResult.MATCH,
                    userId,
                },
            });
            return {
                verified: true,
                reason: 'MATCH',
                shelfBin: {
                    id: shelfBin.id,
                    code: shelfBin.code,
                    qrCode: shelfBin.qrCode,
                    warehouse: shelfBin.row.warehouse.code,
                    warehouseName: shelfBin.row.warehouse.name,
                    row: shelfBin.row.code,
                    zone: shelfBin.zone,
                },
                totalQuantity,
                products: shelfBin.inventories.map((inv) => ({
                    productId: inv.product.id,
                    sku: inv.product.sku,
                    name: inv.product.name,
                    quantity: inv.quantity,
                })),
            };
        }
    }
}
exports.QrService = QrService;
