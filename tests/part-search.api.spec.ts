import { test, expect } from '@playwright/test';

/**
 * InvenTree Part Search & Multi-parameter Filtering API Automation Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-104
 * Test Cases: TC-INVENTREE-009, TC-INVENTREE-010
 */

const BASE_URL = process.env.INVENTREE_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN = process.env.INVENTREE_API_TOKEN || 'test_token';
const authHeaders = {
  Authorization: `Token ${AUTH_TOKEN}`
};

test.describe('Part Search & Filtering - /api/part/', () => {
  test('TC-INVENTREE-009: Multi-parameter query (category + active + keyword search)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      params: { category: 1, active: true, search: 'Bolt' }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);

    // Validate that returned records conform to filter criteria
    for (const part of body.results) {
      expect(part.category).toBe(1);
      expect(part.active).toBe(true);
      const matchesSearch =
        part.name?.toLowerCase().includes('bolt') ||
        part.IPN?.toLowerCase().includes('bolt') ||
        part.description?.toLowerCase().includes('bolt');
      expect(matchesSearch).toBe(true);
    }
  });

  test('TC-INVENTREE-010: Pagination boundaries & limit validation', async ({ request }) => {
    // 1. Default pagination returns count, next, previous, and results array
    const defaultRes = await request.get(`${BASE_URL}/api/part/`, { headers: authHeaders });
    expect(defaultRes.status()).toBe(200);
    const defaultBody = await defaultRes.json();
    expect(defaultBody.count).toBeGreaterThanOrEqual(0);
    expect(defaultBody.results.length).toBeLessThanOrEqual(25);

    // 2. Custom limit and offset
    const pageRes = await request.get(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      params: { limit: 5, offset: 0 }
    });
    expect(pageRes.status()).toBe(200);
    const pageBody = await pageRes.json();
    expect(pageBody.results.length).toBeLessThanOrEqual(5);

    // 3. Negative limit rejection
    const invalidRes = await request.get(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      params: { limit: -1 }
    });
    expect(invalidRes.status()).toBe(400);
  });
});

