import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Product APIs', () => {
  it('GET /api/products should return list of products with location info', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('sku');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('totalQuantity');
    expect(first).toHaveProperty('locations');
    expect(Array.isArray(first.locations)).toBe(true);
  });

  it('GET /api/products/sku/:sku should return specific product by SKU', async () => {
    const res = await request(app).get('/api/products/sku/LOG-G502');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('LOG-G502');
    expect(res.body.data.name).toContain('Logitech G502');
    expect(res.body.data.locations.length).toBeGreaterThan(0);
  });

  it('GET /api/products/search?q= should search by product name and SKU', async () => {
    const resName = await request(app).get('/api/products/search?q=Logitech');
    expect(resName.status).toBe(200);
    expect(resName.body.success).toBe(true);
    expect(resName.body.data.length).toBeGreaterThanOrEqual(2);

    const resSku = await request(app).get('/api/products/search?q=KB-002');
    expect(resSku.status).toBe(200);
    expect(resSku.body.success).toBe(true);
    expect(resSku.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resSku.body.data[0].sku).toBe('KB-002-C02');
  });

  it('GET /api/products/:id should return 404 for nonexistent product ID', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
