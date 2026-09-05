import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Picking Workflow & Safety', () => {
  let testOrder: any;
  let testProduct: any;
  let testBin: any;
  let wrongBin: any;

  beforeAll(async () => {
    // Look up seeded records
    testProduct = await prisma.product.findUniqueOrThrow({
      where: { sku: 'LOG-G502' },
    });

    testBin = await prisma.shelfBin.findUniqueOrThrow({
      where: { qrCode: 'SHELF-WH01-R03-S14' },
    });

    wrongBin = await prisma.shelfBin.findUniqueOrThrow({
      where: { qrCode: 'SHELF-WH01-R05-S15' },
    });

    // Create a dedicated order for testing picking
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}`,
        customerName: 'Picking Test Corp',
        items: {
          create: [
            {
              productId: testProduct.id,
              quantity: 5,
              pickedQuantity: 0,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up test order
    if (testOrder) {
      await prisma.stockMovement.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
  });

  it('POST /api/inventory/pick should successfully pick with sufficient stock', async () => {
    // Check initial stock
    const invBefore = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: testBin.id,
        },
      },
    });

    const res = await request(app)
      .post('/api/inventory/pick')
      .send({
        orderId: testOrder.id,
        productId: testProduct.id,
        binId: testBin.id,
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pickedQuantity).toBe(2);
    expect(res.body.data.orderItem.totalPicked).toBe(2);
    expect(res.body.data.orderStatus).toBe('PICKING');

    // Verify inventory in database was decremented
    const invAfter = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: testBin.id,
        },
      },
    });
    expect(invAfter.quantity).toBe(invBefore.quantity - 2);

    // Verify OUTWARD stock movement was created
    const movement = await prisma.stockMovement.findFirst({
      where: {
        orderId: testOrder.id,
        productId: testProduct.id,
        type: 'OUTWARD',
      },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(2);
    expect(movement?.fromBinId).toBe(testBin.id);
  });

  it('POST /api/inventory/pick should reject picking with insufficient stock', async () => {
    const invBefore = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: testBin.id,
        },
      },
    });

    const res = await request(app)
      .post('/api/inventory/pick')
      .send({
        orderId: testOrder.id,
        productId: testProduct.id,
        binId: testBin.id,
        quantity: invBefore.quantity + 100, // Insufficient!
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PICK_QUANTITY_EXCEEDED');

    // Verify stock did not change
    const invAfter = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: testBin.id,
        },
      },
    });
    expect(invAfter.quantity).toBe(invBefore.quantity);
  });

  it('POST /api/inventory/pick should reject picking from a wrong bin with no stock', async () => {
    const res = await request(app)
      .post('/api/inventory/pick')
      .send({
        orderId: testOrder.id,
        productId: testProduct.id,
        binId: wrongBin.id,
        quantity: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('Inventory should never become negative even under excessive decrement attempts', async () => {
    const invBefore = await prisma.inventory.findUniqueOrThrow({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: testBin.id,
        },
      },
    });

    const res = await request(app)
      .post('/api/inventory/pick')
      .send({
        orderId: testOrder.id,
        productId: testProduct.id,
        binId: testBin.id,
        quantity: 999999,
      });

    expect(res.status).toBe(400);
    expect(invBefore.quantity).toBeGreaterThanOrEqual(0);
  });
});
