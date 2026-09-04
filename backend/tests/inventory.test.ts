import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';

describe('Inventory Movement Operations', () => {
  let testProduct: any;
  let binA: any;
  let binB: any;

  beforeAll(async () => {
    testProduct = await prisma.product.findUniqueOrThrow({
      where: { sku: 'RAM-DDR5-32' },
    });

    binA = await prisma.shelfBin.findUniqueOrThrow({
      where: { qrCode: 'SHELF-WH01-R02-S10' },
    });

    binB = await prisma.shelfBin.findUniqueOrThrow({
      where: { qrCode: 'SHELF-WH01-R02-S11' },
    });
  });

  it('POST /api/inventory/inward should increment stock and create INWARD movement', async () => {
    const invBefore = await prisma.inventory.findUnique({
      where: {
        productId_binId: {
          productId: testProduct.id,
          binId: binA.id,
        },
      },
    });
    const startQty = invBefore?.quantity || 0;

    const res = await request(app)
      .post('/api/inventory/inward')
      .send({
        productId: testProduct.id,
        binId: binA.id,
        quantity: 10,
        reason: 'Restocking batch #882',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inventory.newQuantity).toBe(startQty + 10);

    // Verify StockMovement
    const movement = await prisma.stockMovement.findUnique({
      where: { id: res.body.data.movementId },
    });
    expect(movement?.type).toBe('INWARD');
    expect(movement?.quantity).toBe(10);
    expect(movement?.toBinId).toBe(binA.id);
  });

  it('POST /api/inventory/transfer should move stock from binA to binB and create TRANSFER movement', async () => {
    const res = await request(app)
      .post('/api/inventory/transfer')
      .send({
        productId: testProduct.id,
        fromBinId: binA.id,
        toBinId: binB.id,
        quantity: 5,
        reason: 'Aisle rebalancing',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transferredQuantity).toBe(5);

    const movement = await prisma.stockMovement.findUnique({
      where: { id: res.body.data.movementId },
    });
    expect(movement?.type).toBe('TRANSFER');
    expect(movement?.fromBinId).toBe(binA.id);
    expect(movement?.toBinId).toBe(binB.id);
  });

  it('POST /api/inventory/adjust should update quantity and create ADJUSTMENT movement', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .send({
        productId: testProduct.id,
        binId: binB.id,
        quantity: 8,
        reason: 'Quarterly cycle recount',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newQuantity).toBe(8);

    const movement = await prisma.stockMovement.findUnique({
      where: { id: res.body.data.movementId },
    });
    expect(movement?.type).toBe('ADJUSTMENT');
  });
});
