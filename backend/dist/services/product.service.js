"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const db_1 = __importDefault(require("../config/db"));
class ProductService {
    static async getAllProducts(filters) {
        const where = {};
        if (filters?.category) {
            where.category = filters.category;
        }
        const products = await db_1.default.product.findMany({
            where,
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
                },
            },
            orderBy: { name: 'asc' },
        });
        const enriched = products.map((prod) => {
            const totalQuantity = prod.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
            const isLowStock = totalQuantity <= prod.minStockLevel;
            const locations = prod.inventories.map((inv) => ({
                inventoryId: inv.id,
                binId: inv.bin.id,
                binCode: inv.bin.code,
                qrCode: inv.bin.qrCode,
                rowCode: inv.bin.row.code,
                warehouseCode: inv.bin.row.warehouse.code,
                warehouseName: inv.bin.row.warehouse.name,
                quantity: inv.quantity,
            }));
            return {
                id: prod.id,
                sku: prod.sku,
                name: prod.name,
                description: prod.description,
                category: prod.category,
                price: Number(prod.price),
                minStockLevel: prod.minStockLevel,
                unit: prod.unit,
                qrCode: prod.qrCode,
                barcode: prod.barcode,
                totalQuantity,
                isLowStock,
                locations,
                createdAt: prod.createdAt,
                updatedAt: prod.updatedAt,
            };
        });
        if (filters?.lowStock) {
            return enriched.filter((p) => p.isLowStock);
        }
        return enriched;
    }
    static async getProductById(id) {
        const prod = await db_1.default.product.findUnique({
            where: { id },
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
                },
            },
        });
        if (!prod) {
            const error = new Error('Product not found');
            error.code = 'PRODUCT_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const totalQuantity = prod.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
        const locations = prod.inventories.map((inv) => ({
            inventoryId: inv.id,
            binId: inv.bin.id,
            binCode: inv.bin.code,
            qrCode: inv.bin.qrCode,
            rowCode: inv.bin.row.code,
            warehouseCode: inv.bin.row.warehouse.code,
            warehouseName: inv.bin.row.warehouse.name,
            quantity: inv.quantity,
        }));
        return {
            id: prod.id,
            sku: prod.sku,
            name: prod.name,
            description: prod.description,
            category: prod.category,
            price: Number(prod.price),
            minStockLevel: prod.minStockLevel,
            unit: prod.unit,
            qrCode: prod.qrCode,
            barcode: prod.barcode,
            totalQuantity,
            isLowStock: totalQuantity <= prod.minStockLevel,
            locations,
            createdAt: prod.createdAt,
            updatedAt: prod.updatedAt,
        };
    }
    static async getProductBySku(sku) {
        const prod = await db_1.default.product.findUnique({
            where: { sku: sku.toUpperCase() },
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
                },
            },
        });
        if (!prod) {
            const error = new Error(`Product with SKU '${sku}' not found`);
            error.code = 'PRODUCT_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const totalQuantity = prod.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
        const locations = prod.inventories.map((inv) => ({
            inventoryId: inv.id,
            binId: inv.bin.id,
            binCode: inv.bin.code,
            qrCode: inv.bin.qrCode,
            rowCode: inv.bin.row.code,
            warehouseCode: inv.bin.row.warehouse.code,
            warehouseName: inv.bin.row.warehouse.name,
            quantity: inv.quantity,
        }));
        return {
            id: prod.id,
            sku: prod.sku,
            name: prod.name,
            description: prod.description,
            category: prod.category,
            price: Number(prod.price),
            minStockLevel: prod.minStockLevel,
            unit: prod.unit,
            qrCode: prod.qrCode,
            barcode: prod.barcode,
            totalQuantity,
            isLowStock: totalQuantity <= prod.minStockLevel,
            locations,
            createdAt: prod.createdAt,
            updatedAt: prod.updatedAt,
        };
    }
    static async searchProducts(query) {
        if (!query || query.trim().length === 0) {
            return this.getAllProducts();
        }
        const q = query.trim();
        const products = await db_1.default.product.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } },
                    { category: { contains: q, mode: 'insensitive' } },
                    { barcode: { contains: q, mode: 'insensitive' } },
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
                },
            },
            orderBy: { name: 'asc' },
        });
        return products.map((prod) => {
            const totalQuantity = prod.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
            const locations = prod.inventories.map((inv) => ({
                inventoryId: inv.id,
                binId: inv.bin.id,
                binCode: inv.bin.code,
                qrCode: inv.bin.qrCode,
                rowCode: inv.bin.row.code,
                warehouseCode: inv.bin.row.warehouse.code,
                quantity: inv.quantity,
            }));
            return {
                id: prod.id,
                sku: prod.sku,
                name: prod.name,
                category: prod.category,
                price: Number(prod.price),
                minStockLevel: prod.minStockLevel,
                unit: prod.unit,
                totalQuantity,
                isLowStock: totalQuantity <= prod.minStockLevel,
                locations,
            };
        });
    }
    static async createProduct(input) {
        const existing = await db_1.default.product.findUnique({
            where: { sku: input.sku },
        });
        if (existing) {
            const error = new Error(`Product with SKU '${input.sku}' already exists`);
            error.code = 'DUPLICATE_SKU';
            error.statusCode = 409;
            throw error;
        }
        const created = await db_1.default.product.create({
            data: {
                sku: input.sku,
                name: input.name,
                description: input.description,
                category: input.category,
                price: input.price,
                minStockLevel: input.minStockLevel,
                unit: input.unit || 'pcs',
                qrCode: `SKU-${input.sku}`,
                barcode: input.barcode,
            },
        });
        return created;
    }
    static async updateProduct(id, input) {
        const existing = await db_1.default.product.findUnique({ where: { id } });
        if (!existing) {
            const error = new Error('Product not found');
            error.code = 'PRODUCT_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const updated = await db_1.default.product.update({
            where: { id },
            data: {
                ...input,
                ...(input.sku ? { sku: input.sku.toUpperCase() } : {}),
            },
        });
        return updated;
    }
    static async deleteProduct(id) {
        const prod = await db_1.default.product.findUnique({
            where: { id },
            include: {
                inventories: true,
                orderItems: true,
            },
        });
        if (!prod) {
            const error = new Error('Product not found');
            error.code = 'PRODUCT_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const hasStock = prod.inventories.some((inv) => inv.quantity > 0);
        if (hasStock) {
            const error = new Error('Cannot delete product with active inventory stock');
            error.code = 'PRODUCT_HAS_STOCK';
            error.statusCode = 400;
            throw error;
        }
        await db_1.default.product.delete({ where: { id } });
        return { id, message: 'Product deleted successfully' };
    }
}
exports.ProductService = ProductService;
