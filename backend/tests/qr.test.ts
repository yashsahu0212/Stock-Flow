import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('QR Verification APIs', () => {
  it('POST /api/qr/verify should return MATCH when valid product QR matches expected SKU', async () => {
    const res = await request(app)
      .post('/api/qr/verify')
      .send({
        qrCode: 'SKU-LOG-G502',
        expectedSku: 'LOG-G502',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(true);
    expect(res.body.data.reason).toBe('MATCH');
    expect(res.body.data.product.sku).toBe('LOG-G502');
    expect(res.body.data.location).toBeDefined();
    expect(res.body.data.availableQuantity).toBeGreaterThanOrEqual(27);
  });

  it('POST /api/qr/verify should detect WRONG_PRODUCT when scanned SKU does not match expected SKU', async () => {
    const res = await request(app)
      .post('/api/qr/verify')
      .send({
        qrCode: 'SKU-LOG-G305',
        expectedSku: 'LOG-G502',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(false);
    expect(res.body.data.reason).toBe('WRONG_PRODUCT');
    expect(res.body.data.expectedSku).toBe('LOG-G502');
    expect(res.body.data.scannedSku).toBe('LOG-G305');
    expect(res.body.data.message).toBe('Wrong product scanned');
  });

  it('POST /api/qr/verify should detect INVALID_QR when QR code is not registered', async () => {
    const res = await request(app)
      .post('/api/qr/verify')
      .send({
        qrCode: 'NON-EXISTENT-QR-99999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(false);
    expect(res.body.data.reason).toBe('INVALID_QR');
    expect(res.body.data.message).toBe('QR code is not registered');
  });

  it('POST /api/qr/verify should verify shelf/bin QR code', async () => {
    const res = await request(app)
      .post('/api/qr/verify')
      .send({
        qrCode: 'SHELF-WH01-R03-S14',
        expectedBinCode: 'S14',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(true);
    expect(res.body.data.reason).toBe('MATCH');
    expect(res.body.data.shelfBin.code).toBe('S14');
  });

  it('POST /api/qr/verify should detect WRONG_LOCATION when scanning the wrong shelf', async () => {
    const res = await request(app)
      .post('/api/qr/verify')
      .send({
        qrCode: 'SHELF-WH01-R03-S14',
        expectedBinCode: 'S01',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verified).toBe(false);
    expect(res.body.data.reason).toBe('WRONG_LOCATION');
    expect(res.body.data.message).toBe('Wrong location/shelf scanned');
  });
});
