"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
class InventoryService {
    static async getAllInventory(filters) {
        const where = {};
        if (filters?.productId)
            where.productId = filters.productId;
        if (filters?.binId)
            where.binId = filters.binId;
        if (filters?.warehouseId) {
            where.bin = {
                row: {
                    warehouseId: filters.warehouseId,
                },
            };
        }
        const inventories = await db_1.default.inventory.findMany({
            where,
            include: {
                product: true,
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
            orderBy: { updatedAt: 'desc' },
        });
        return inventories.map((inv) => ({
            id: inv.id,
            quantity: inv.quantity,
            reservedQuantity: inv.reservedQuantity,
            availableQuantity: Math.max(0, inv.quantity - inv.reservedQuantity),
            product: {
                id: inv.product.id,
                sku: inv.product.sku,
                name: inv.product.name,
                category: inv.product.category,
                minStockLevel: inv.product.minStockLevel,
            },
            location: {
                binId: inv.bin.id,
                binCode: inv.bin.code,
                qrCode: inv.bin.qrCode,
                rowCode: inv.bin.row.code,
                warehouseCode: inv.bin.row.warehouse.code,
                warehouseName: inv.bin.row.warehouse.name,
            },
            updatedAt: inv.updatedAt,
        }));
    }
    static async getInventoryByProduct(productId) {
        const product = await db_1.default.product.findUnique({ where: { id: productId } });
        if (!product) {
            const error = new Error('Product not found');
            error.code = 'PRODUCT_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const records = await db_1.default.inventory.findMany({
            where: { productId },
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
        });
        const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
        return {
            product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                totalQuantity,
                minStockLevel: product.minStockLevel,
            },
            locations: records.map((r) => ({
                inventoryId: r.id,
                binId: r.bin.id,
                binCode: r.bin.code,
                qrCode: r.bin.qrCode,
                rowCode: r.bin.row.code,
                warehouseCode: r.bin.row.warehouse.code,
                warehouseName: r.bin.row.warehouse.name,
                quantity: r.quantity,
                updatedAt: r.updatedAt,
            })),
        };
    }
    static async getInventoryByBin(binId) {
        const bin = await db_1.default.shelfBin.findUnique({
            where: { id: binId },
            include: {
                row: {
                    include: {
                        warehouse: true,
                    },
                },
            },
        });
        if (!bin) {
            const error = new Error('Bin not found');
            error.code = 'BIN_NOT_FOUND';
            error.statusCode = 404;
            throw error;
        }
        const records = await db_1.default.inventory.findMany({
            where: { binId },
            include: {
                product: true,
            },
        });
        return {
            bin: {
                id: bin.id,
                code: bin.code,
                qrCode: bin.qrCode,
                warehouse: bin.row.warehouse.code,
                row: bin.row.code,
            },
            items: records.map((r) => ({
                inventoryId: r.id,
                productId: r.product.id,
                sku: r.product.sku,
                name: r.product.name,
                quantity: r.quantity,
                updatedAt: r.updatedAt,
            })),
        };
    }
    static async inward(input, userId) {
        return db_1.default.$transaction(async (tx) => {
            // 1. Verify product exists
            const product = await tx.product.findUnique({ where: { id: input.productId } });
            if (!product) {
                const error = new Error(`Product with ID '${input.productId}' not found`);
                error.code = 'PRODUCT_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            // 2. Verify bin exists
            const bin = await tx.shelfBin.findUnique({
                where: { id: input.binId },
                include: {
                    row: { include: { warehouse: true } },
                },
            });
            if (!bin) {
                const error = new Error(`Bin with ID '${input.binId}' not found`);
                error.code = 'BIN_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            // 3. Upsert inventory record atomically
            const inventory = await tx.inventory.upsert({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.binId,
                    },
                },
                create: {
                    productId: input.productId,
                    binId: input.binId,
                    quantity: input.quantity,
                },
                update: {
                    quantity: {
                        increment: input.quantity,
                    },
                },
            });
            // 4. Record audit stock movement
            const movement = await tx.stockMovement.create({
                data: {
                    productId: input.productId,
                    type: client_1.MovementType.INWARD,
                    quantity: input.quantity,
                    toBinId: input.binId,
                    userId,
                    reason: input.reason || 'Standard inward receipt',
                },
            });
            return {
                inventory: {
                    id: inventory.id,
                    productId: product.id,
                    sku: product.sku,
                    name: product.name,
                    binId: bin.id,
                    binCode: bin.code,
                    warehouseCode: bin.row.warehouse.code,
                    newQuantity: inventory.quantity,
                },
                movementId: movement.id,
            };
        });
    }
    static async pick(input, userId) {
        return db_1.default.$transaction(async (tx) => {
            // 1. Validate Order
            const order = await tx.order.findUnique({
                where: { id: input.orderId },
                include: {
                    items: true,
                },
            });
            if (!order) {
                const error = new Error(`Order '${input.orderId}' not found`);
                error.code = 'ORDER_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            if (order.status === client_1.OrderStatus.COMPLETED) {
                const error = new Error(`Order '${order.orderNumber}' is already completed`);
                error.code = 'ORDER_ALREADY_COMPLETED';
                error.statusCode = 400;
                throw error;
            }
            if (order.status === client_1.OrderStatus.CANCELLED) {
                const error = new Error(`Order '${order.orderNumber}' has been cancelled`);
                error.code = 'ORDER_CANCELLED';
                error.statusCode = 400;
                throw error;
            }
            // 2. Validate Order Item for this product
            const orderItem = order.items.find((item) => item.productId === input.productId);
            if (!orderItem) {
                const error = new Error(`Product '${input.productId}' is not part of Order '${order.orderNumber}'`);
                error.code = 'PRODUCT_NOT_IN_ORDER';
                error.statusCode = 400;
                throw error;
            }
            const remainingToPick = orderItem.quantity - orderItem.pickedQuantity;
            if (remainingToPick <= 0) {
                const error = new Error(`Product is already fully picked for this order`);
                error.code = 'ALREADY_FULLY_PICKED';
                error.statusCode = 400;
                throw error;
            }
            if (input.quantity > remainingToPick) {
                const error = new Error(`Cannot pick ${input.quantity} units. Only ${remainingToPick} units remaining to fulfill this item`);
                error.code = 'PICK_QUANTITY_EXCEEDED';
                error.statusCode = 400;
                throw error;
            }
            // 3. Validate Bin and Inventory
            const bin = await tx.shelfBin.findUnique({
                where: { id: input.binId },
                include: {
                    row: { include: { warehouse: true } },
                },
            });
            if (!bin) {
                const error = new Error(`Bin '${input.binId}' not found`);
                error.code = 'BIN_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.binId,
                    },
                },
                include: {
                    product: true,
                },
            });
            if (!inventory || inventory.quantity < input.quantity) {
                const available = inventory ? inventory.quantity : 0;
                const error = new Error(`Insufficient stock in bin ${bin.code}. Requested: ${input.quantity}, Available: ${available}`);
                error.code = 'INSUFFICIENT_STOCK';
                error.statusCode = 400;
                throw error;
            }
            // 4. Decrement Inventory (guarantee non-negative)
            const updatedInventory = await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantity: {
                        decrement: input.quantity,
                    },
                },
            });
            if (updatedInventory.quantity < 0) {
                const error = new Error('Database safety constraint: inventory cannot become negative');
                error.code = 'INSUFFICIENT_STOCK';
                error.statusCode = 400;
                throw error;
            }
            // 5. Update OrderItem
            const newPickedQuantity = orderItem.pickedQuantity + input.quantity;
            const isItemCompleted = newPickedQuantity === orderItem.quantity;
            const updatedOrderItem = await tx.orderItem.update({
                where: { id: orderItem.id },
                data: {
                    pickedQuantity: newPickedQuantity,
                    status: isItemCompleted ? client_1.OrderItemStatus.PICKED : client_1.OrderItemStatus.PENDING,
                },
            });
            // 6. Record OUTWARD Stock Movement
            const movement = await tx.stockMovement.create({
                data: {
                    productId: input.productId,
                    type: client_1.MovementType.OUTWARD,
                    quantity: input.quantity,
                    fromBinId: input.binId,
                    orderId: order.id,
                    userId,
                    reason: `Order pick fulfillment for ${order.orderNumber}`,
                },
            });
            // 7. Check if entire order is fully picked
            const allItems = await tx.orderItem.findMany({
                where: { orderId: order.id },
            });
            const isOrderComplete = allItems.every((item) => item.pickedQuantity >= item.quantity);
            const newOrderStatus = isOrderComplete ? client_1.OrderStatus.PICKED : client_1.OrderStatus.PICKING;
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: newOrderStatus,
                },
            });
            return {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                orderStatus: updatedOrder.status,
                product: {
                    id: inventory.product.id,
                    sku: inventory.product.sku,
                    name: inventory.product.name,
                },
                bin: {
                    id: bin.id,
                    code: bin.code,
                    qrCode: bin.qrCode,
                    warehouse: bin.row.warehouse.code,
                    remainingBinStock: updatedInventory.quantity,
                },
                pickedQuantity: input.quantity,
                orderItem: {
                    totalRequired: updatedOrderItem.quantity,
                    totalPicked: updatedOrderItem.pickedQuantity,
                    isCompleted: isItemCompleted,
                },
                movementId: movement.id,
            };
        });
    }
    static async transfer(input, userId) {
        return db_1.default.$transaction(async (tx) => {
            // 1. Validate Product
            const product = await tx.product.findUnique({ where: { id: input.productId } });
            if (!product) {
                const error = new Error('Product not found');
                error.code = 'PRODUCT_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            // 2. Validate Source Bin and Available Stock
            const sourceInv = await tx.inventory.findUnique({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.fromBinId,
                    },
                },
                include: {
                    bin: true,
                },
            });
            if (!sourceInv || sourceInv.quantity < input.quantity) {
                const available = sourceInv ? sourceInv.quantity : 0;
                const error = new Error(`Insufficient stock in source bin. Requested: ${input.quantity}, Available: ${available}`);
                error.code = 'INSUFFICIENT_STOCK';
                error.statusCode = 400;
                throw error;
            }
            // 3. Validate Destination Bin
            const destBin = await tx.shelfBin.findUnique({
                where: { id: input.toBinId },
            });
            if (!destBin) {
                const error = new Error('Destination bin not found');
                error.code = 'BIN_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            // 4. Decrement from source
            await tx.inventory.update({
                where: { id: sourceInv.id },
                data: {
                    quantity: {
                        decrement: input.quantity,
                    },
                },
            });
            // 5. Increment in destination
            const destInv = await tx.inventory.upsert({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.toBinId,
                    },
                },
                create: {
                    productId: input.productId,
                    binId: input.toBinId,
                    quantity: input.quantity,
                },
                update: {
                    quantity: {
                        increment: input.quantity,
                    },
                },
            });
            // 6. Record Stock Movement
            const movement = await tx.stockMovement.create({
                data: {
                    productId: input.productId,
                    type: client_1.MovementType.TRANSFER,
                    quantity: input.quantity,
                    fromBinId: input.fromBinId,
                    toBinId: input.toBinId,
                    userId,
                    reason: input.reason || 'Internal warehouse relocation',
                },
            });
            return {
                product: {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                },
                transferredQuantity: input.quantity,
                fromBinId: input.fromBinId,
                toBinId: input.toBinId,
                destNewQuantity: destInv.quantity,
                movementId: movement.id,
            };
        });
    }
    static async adjust(input, userId) {
        return db_1.default.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: input.productId } });
            if (!product) {
                const error = new Error('Product not found');
                error.code = 'PRODUCT_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            const bin = await tx.shelfBin.findUnique({ where: { id: input.binId } });
            if (!bin) {
                const error = new Error('Bin not found');
                error.code = 'BIN_NOT_FOUND';
                error.statusCode = 404;
                throw error;
            }
            const existingInv = await tx.inventory.findUnique({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.binId,
                    },
                },
            });
            const oldQuantity = existingInv ? existingInv.quantity : 0;
            const difference = input.quantity - oldQuantity;
            const updatedInv = await tx.inventory.upsert({
                where: {
                    productId_binId: {
                        productId: input.productId,
                        binId: input.binId,
                    },
                },
                create: {
                    productId: input.productId,
                    binId: input.binId,
                    quantity: input.quantity,
                },
                update: {
                    quantity: input.quantity,
                },
            });
            const movement = await tx.stockMovement.create({
                data: {
                    productId: input.productId,
                    type: client_1.MovementType.ADJUSTMENT,
                    quantity: Math.abs(difference),
                    fromBinId: difference < 0 ? input.binId : null,
                    toBinId: difference > 0 ? input.binId : null,
                    userId,
                    reason: `${input.reason} (Old: ${oldQuantity}, New: ${input.quantity})`,
                },
            });
            return {
                product: {
                    id: product.id,
                    sku: product.sku,
                    name: product.name,
                },
                bin: {
                    id: bin.id,
                    code: bin.code,
                },
                oldQuantity,
                newQuantity: updatedInv.quantity,
                difference,
                movementId: movement.id,
            };
        });
    }
}
exports.InventoryService = InventoryService;
