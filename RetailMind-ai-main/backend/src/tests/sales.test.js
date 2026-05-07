/**
 * Sales API Integration Tests
 * 
 * Test suite for the Sales module with UPSERT logic
 * Covers:
 * - POST /api/sales (create with validation and UPSERT)
 * - GET /api/sales (with filtering and pagination)
 * - GET /api/sales/summary (daily aggregates)
 * - POST /api/sales/bulk-upload (CSV import)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/sales';

// Valid test UUIDs
const TEST_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440000';
const INVALID_UUID = 'invalid-uuid-format';
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('Sales API', () => {
  
  // ============================================================================
  // POST /api/sales - Create Sale with UPSERT
  // ============================================================================
  
  describe('POST /api/sales', () => {
    
    it('should create a new sale successfully (201)', async () => {
      const response = await axios.post(BASE_URL, {
        product_id: TEST_PRODUCT_ID,
        qty_sold: 10,
        sale_date: '2026-05-05'
      });

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data.product_id).toBe(TEST_PRODUCT_ID);
      expect(response.data.data.quantity).toBe(10);
      expect(response.data.data.sale_date).toBe('2026-05-05');
    });

    it('should UPSERT when creating duplicate (product_id, sale_date)', async () => {
      const saleData = {
        product_id: TEST_PRODUCT_ID,
        qty_sold: 5,
        sale_date: '2026-05-06'
      };

      // First create
      const response1 = await axios.post(BASE_URL, saleData);
      expect(response1.status).toBe(201);
      const firstQuantity = response1.data.data.quantity;

      // Second create (should update)
      const response2 = await axios.post(BASE_URL, saleData);
      expect(response2.status).toBe(201);
      const secondQuantity = response2.data.data.quantity;

      // Quantity should be doubled (5 + 5)
      expect(secondQuantity).toBe(firstQuantity + saleData.qty_sold);
    });

    // ---- Validation Tests ----

    it('should reject missing product_id (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          qty_sold: 10,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('product_id is required');
      }
    });

    it('should reject invalid product_id format (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: INVALID_UUID,
          qty_sold: 10,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('product_id must be a valid UUID');
      }
    });

    it('should reject non-existent product_id (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: NON_EXISTENT_UUID,
          qty_sold: 10,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('product_id does not exist');
      }
    });

    it('should reject missing qty_sold (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('qty_sold is required');
      }
    });

    it('should reject qty_sold <= 0 (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 0,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('qty_sold must be greater than 0');
      }
    });

    it('should reject negative qty_sold (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: -5,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('qty_sold must be greater than 0');
      }
    });

    it('should reject non-integer qty_sold (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 'abc',
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('qty_sold must be an integer');
      }
    });

    it('should reject decimal qty_sold (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 10.5,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('qty_sold must be an integer');
      }
    });

    it('should reject missing sale_date (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 10
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('sale_date is required');
      }
    });

    it('should reject invalid sale_date format (422)', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 10,
          sale_date: '05/05/2026' // Wrong format
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('sale_date must be a valid date');
      }
    });

    it('should reject future sale_date (422)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split('T')[0];

      try {
        await axios.post(BASE_URL, {
          product_id: TEST_PRODUCT_ID,
          qty_sold: 10,
          sale_date: futureDate
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.message).toContain('sale_date cannot be in the future');
      }
    });
  });

  // ============================================================================
  // GET /api/sales - Retrieve with Filtering
  // ============================================================================

  describe('GET /api/sales', () => {
    
    it('should retrieve sales successfully (200)', async () => {
      const response = await axios.get(BASE_URL);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('count');
      expect(response.data).toHaveProperty('limit');
      expect(response.data).toHaveProperty('offset');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should filter by product_id', async () => {
      const response = await axios.get(BASE_URL, {
        params: { product_id: TEST_PRODUCT_ID }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(sale => {
        expect(sale.product_id).toBe(TEST_PRODUCT_ID);
      });
    });

    it('should filter by start_date', async () => {
      const response = await axios.get(BASE_URL, {
        params: { start_date: '2026-05-01' }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(sale => {
        expect(new Date(sale.sale_date)).toBeGreaterThanOrEqual(new Date('2026-05-01'));
      });
    });

    it('should filter by end_date', async () => {
      const response = await axios.get(BASE_URL, {
        params: { end_date: '2026-05-31' }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(sale => {
        expect(new Date(sale.sale_date)).toBeLessThanOrEqual(new Date('2026-05-31'));
      });
    });

    it('should filter by date range', async () => {
      const response = await axios.get(BASE_URL, {
        params: { start_date: '2026-05-01', end_date: '2026-05-31' }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(sale => {
        const saleDate = new Date(sale.sale_date);
        expect(saleDate).toBeGreaterThanOrEqual(new Date('2026-05-01'));
        expect(saleDate).toBeLessThanOrEqual(new Date('2026-05-31'));
      });
    });

    it('should support limit parameter', async () => {
      const response = await axios.get(BASE_URL, {
        params: { limit: 5 }
      });

      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(5);
      expect(response.data.limit).toBe(5);
    });

    it('should support offset parameter', async () => {
      const response = await axios.get(BASE_URL, {
        params: { offset: 10 }
      });

      expect(response.status).toBe(200);
      expect(response.data.offset).toBe(10);
    });

    it('should reject limit > 1000 (400)', async () => {
      try {
        await axios.get(BASE_URL, {
          params: { limit: 2000 }
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('limit must be between 1 and 1000');
      }
    });

    it('should reject negative offset (400)', async () => {
      try {
        await axios.get(BASE_URL, {
          params: { offset: -1 }
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('offset must be non-negative');
      }
    });
  });

  // ============================================================================
  // GET /api/sales/summary - Daily Aggregates
  // ============================================================================

  describe('GET /api/sales/summary', () => {
    
    it('should retrieve daily summary successfully (200)', async () => {
      const response = await axios.get(`${BASE_URL}/summary`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data).toHaveProperty('count');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    it('should include transaction_count, total_quantity, total_revenue', async () => {
      const response = await axios.get(`${BASE_URL}/summary`);

      if (response.data.data.length > 0) {
        const summary = response.data.data[0];
        expect(summary).toHaveProperty('sale_date');
        expect(summary).toHaveProperty('transaction_count');
        expect(summary).toHaveProperty('total_quantity');
        expect(summary).toHaveProperty('total_revenue');
      }
    });

    it('should filter summary by start_date', async () => {
      const response = await axios.get(`${BASE_URL}/summary`, {
        params: { start_date: '2026-05-01' }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(summary => {
        expect(new Date(summary.sale_date)).toBeGreaterThanOrEqual(new Date('2026-05-01'));
      });
    });

    it('should filter summary by end_date', async () => {
      const response = await axios.get(`${BASE_URL}/summary`, {
        params: { end_date: '2026-05-31' }
      });

      expect(response.status).toBe(200);
      response.data.data.forEach(summary => {
        expect(new Date(summary.sale_date)).toBeLessThanOrEqual(new Date('2026-05-31'));
      });
    });

    it('should reject invalid start_date format (400)', async () => {
      try {
        await axios.get(`${BASE_URL}/summary`, {
          params: { start_date: '05/01/2026' }
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('start_date must be in YYYY-MM-DD format');
      }
    });
  });

  // ============================================================================
  // POST /api/sales/bulk-upload - CSV Import
  // ============================================================================

  describe('POST /api/sales/bulk-upload', () => {
    
    it('should reject missing file (400)', async () => {
      try {
        await axios.post(`${BASE_URL}/bulk-upload`);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('No file uploaded');
      }
    });

    it('should reject empty CSV (400)', async () => {
      const formData = new FormData();
      formData.append('file', new Blob([''], { type: 'text/csv' }), 'empty.csv');

      try {
        await axios.post(`${BASE_URL}/bulk-upload`, formData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('CSV must have headers and at least one row');
      }
    });

    it('should reject missing required columns (400)', async () => {
      const csvContent = 'sku,product_id\nMILK-001,550e8400-e29b-41d4-a716-446655440000';
      const formData = new FormData();
      formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'invalid.csv');

      try {
        await axios.post(`${BASE_URL}/bulk-upload`, formData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('Missing required columns');
      }
    });

    it('should bulk upload valid CSV (201)', async () => {
      const csvContent = `sku,sale_date,quantity
MILK-001,2026-05-05,10
CHEESE-001,2026-05-05,5`;
      const formData = new FormData();
      formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'valid.csv');

      const response = await axios.post(`${BASE_URL}/bulk-upload`, formData);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('uploadedCount');
      expect(response.data).toHaveProperty('errorCount');
    });
  });

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe('Security - SQL Injection Prevention', () => {
    
    it('should prevent SQL injection in product_id', async () => {
      try {
        await axios.post(BASE_URL, {
          product_id: "'; DROP TABLE sales; --",
          qty_sold: 10,
          sale_date: '2026-05-05'
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(422);
        // Should fail UUID validation, not SQL injection
      }
    });

    it('should prevent SQL injection in date filter', async () => {
      const response = await axios.get(BASE_URL, {
        params: { start_date: "2026-05-01'; DROP TABLE sales; --" }
      });

      // Should not crash, should either return empty or ignore malicious input
      expect(response.status).toBe(200);
    });
  });
});
