import prisma from '../config/db';
import { OrderPriority, OrderStatus } from '@prisma/client';
import { CreateOrderInput } from '../validators/order.validator';

export class OrderService {
  static async getAllOrders(filters?: { status?: OrderStatus; priority?: OrderPriority }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;

    const orders = await prisma.order.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((ord) => {
      const totalItems = ord.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPicked = ord.items.reduce((sum, item) => sum + item.pickedQuantity, 0);
      const progressPercent = totalItems > 0 ? Math.round((totalPicked / totalItems) * 100) : 0;

      return {
        id: ord.id,
        orderNumber: ord.orderNumber,
        customerName: ord.customerName,
        status: ord.status,
        priority: ord.priority,
        totalItems,
        totalPicked,
        progressPercent,
        itemsCount: ord.items.length,
        assignedTo: ord.assignedTo,
        createdAt: ord.createdAt,
        updatedAt: ord.updatedAt,
      };
    });
  }

  static async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
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
            },
          },
        },
        movements: {
          include: {
            product: true,
            fromBin: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      const error: any = new Error('Order not found');
      error.code = 'ORDER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const items = order.items.map((item) => {
      const availableBins = item.product.inventories
        .filter((inv) => inv.quantity > 0)
        .map((inv) => ({
          binId: inv.bin.id,
          binCode: inv.bin.code,
          qrCode: inv.bin.qrCode,
          rowCode: inv.bin.row.code,
          warehouseCode: inv.bin.row.warehouse.code,
          availableQuantity: inv.quantity,
        }));

      const totalAvailable = availableBins.reduce((sum, b) => sum + b.availableQuantity, 0);

      return {
        orderItemId: item.id,
        productId: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        category: item.product.category,
        price: Number(item.product.price),
        requestedQuantity: item.quantity,
        pickedQuantity: item.pickedQuantity,
        remainingQuantity: Math.max(0, item.quantity - item.pickedQuantity),
        status: item.status,
        totalAvailableStock: totalAvailable,
        suggestedBins: availableBins,
      };
    });

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPicked = order.items.reduce((sum, item) => sum + item.pickedQuantity, 0);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      priority: order.priority,
      totalItems,
      totalPicked,
      progressPercent: totalItems > 0 ? Math.round((totalPicked / totalItems) * 100) : 0,
      assignedTo: order.assignedTo,
      items,
      recentPicks: order.movements.map((m) => ({
        movementId: m.id,
        productName: m.product.name,
        sku: m.product.sku,
        quantity: m.quantity,
        binCode: m.fromBin?.code,
        pickedBy: m.user?.name,
        timestamp: m.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  static async createOrder(input: CreateOrderInput) {
    const timestamp = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `ORD-2026-${timestamp}${randomSuffix}`;

    return prisma.$transaction(async (tx) => {
      // Validate all products exist
      for (const item of input.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) {
          const error: any = new Error(`Product with ID '${item.productId}' does not exist`);
          error.code = 'PRODUCT_NOT_FOUND';
          error.statusCode = 404;
          throw error;
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: input.customerName,
          priority: input.priority,
          assignedToUserId: input.assignedToUserId,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return order;
    });
  }

  static async updateOrderStatus(id: string, status: OrderStatus) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      const error: any = new Error('Order not found');
      error.code = 'ORDER_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return updated;
  }

  static async getOrderItems(orderId: string) {
    const order = await this.getOrderById(orderId);
    return order.items;
  }
}
