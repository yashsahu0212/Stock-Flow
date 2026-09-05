import prisma from '../config/db';
import { MovementType, OrderStatus } from '@prisma/client';

export class DashboardService {
  static async getSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Total products count
    const totalProducts = await prisma.product.count();

    // 2. Total units in inventory
    const inventorySum = await prisma.inventory.aggregate({
      _sum: {
        quantity: true,
      },
    });
    const totalUnits = inventorySum._sum.quantity || 0;

    // 3. Low stock and out-of-stock products
    const allProducts = await prisma.product.findMany({
      include: {
        inventories: {
          select: { quantity: true },
        },
      },
    });

    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    for (const p of allProducts) {
      const currentStock = p.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      if (currentStock === 0) {
        outOfStockProducts++;
      } else if (currentStock <= p.minStockLevel) {
        lowStockProducts++;
      }
    }

    // 4. Orders stats
    const pendingOrders = await prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PICKING],
        },
      },
    });

    const completedOrders = await prisma.order.count({
      where: {
        status: OrderStatus.COMPLETED,
      },
    });

    // 5. Today's Movements
    const todayMovements = await prisma.stockMovement.count({
      where: {
        createdAt: { gte: todayStart },
      },
    });

    // 6. Today's Picks
    const todayPicks = await prisma.stockMovement.count({
      where: {
        type: MovementType.OUTWARD,
        createdAt: { gte: todayStart },
      },
    });

    return {
      totalProducts,
      totalUnits,
      lowStockProducts,
      outOfStockProducts,
      pendingOrders,
      completedOrders,
      todayMovements,
      todayPicks,
      timestamp: new Date(),
    };
  }

  static async getLowStockProducts() {
    const products = await prisma.product.findMany({
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
      orderBy: { minStockLevel: 'desc' },
    });

    const lowStockItems = [];

    for (const prod of products) {
      const currentQuantity = prod.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      if (currentQuantity <= prod.minStockLevel) {
        const locations = prod.inventories.map((inv) => ({
          binId: inv.bin.id,
          binCode: inv.bin.code,
          qrCode: inv.bin.qrCode,
          rowCode: inv.bin.row.code,
          warehouseCode: inv.bin.row.warehouse.code,
          quantity: inv.quantity,
        }));

        lowStockItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          currentQuantity,
          minStockLevel: prod.minStockLevel,
          shortfall: prod.minStockLevel - currentQuantity,
          status: currentQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          locations,
        });
      }
    }

    return lowStockItems.sort((a, b) => a.currentQuantity - b.currentQuantity);
  }

  static async getRecentMovements(limit = 20) {
    const movements = await prisma.stockMovement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, sku: true, name: true, category: true },
        },
        fromBin: {
          select: { id: true, code: true, qrCode: true },
        },
        toBin: {
          select: { id: true, code: true, qrCode: true },
        },
        order: {
          select: { id: true, orderNumber: true, customerName: true },
        },
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return movements.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      product: m.product,
      fromBin: m.fromBin ? { id: m.fromBin.id, code: m.fromBin.code, qrCode: m.fromBin.qrCode } : null,
      toBin: m.toBin ? { id: m.toBin.id, code: m.toBin.code, qrCode: m.toBin.qrCode } : null,
      order: m.order ? { id: m.order.id, orderNumber: m.order.orderNumber } : null,
      performedBy: m.user ? { name: m.user.name, role: m.user.role } : null,
      reason: m.reason,
      timestamp: m.createdAt,
    }));
  }
}
