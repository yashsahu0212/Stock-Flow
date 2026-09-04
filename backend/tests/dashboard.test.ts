import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Dashboard APIs', () => {
  it('GET /api/dashboard/summary should return authoritative counts', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.totalProducts).toBeGreaterThanOrEqual(25);
    expect(data.totalUnits).toBeGreaterThan(0);
    expect(typeof data.lowStockProducts).toBe('number');
    expect(typeof data.outOfStockProducts).toBe('number');
    expect(typeof data.pendingOrders).toBe('number');
    expect(typeof data.completedOrders).toBe('number');
    expect(typeof data.todayMovements).toBe('number');
    expect(typeof data.todayPicks).toBe('number');
  });

  it('GET /api/dashboard/low-stock should return products below min stock level', async () => {
    const res = await request(app).get('/api/dashboard/low-stock');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const item = res.body.data[0];
    expect(item).toHaveProperty('sku');
    expect(item).toHaveProperty('currentQuantity');
    expect(item).toHaveProperty('minStockLevel');
    expect(item.currentQuantity).toBeLessThanOrEqual(item.minStockLevel);
  });

  it('GET /api/dashboard/recent-movements should return latest audit log', async () => {
    const res = await request(app).get('/api/dashboard/recent-movements?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const movement = res.body.data[0];
      expect(movement).toHaveProperty('type');
      expect(movement).toHaveProperty('quantity');
      expect(movement).toHaveProperty('product');
      expect(movement).toHaveProperty('timestamp');
    }
  });
});
