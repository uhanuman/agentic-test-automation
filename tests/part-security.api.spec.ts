import { test, expect } from '@playwright/test';

/**
 * InvenTree Part Security & OWASP Hardening API Automation Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-105
 * Test Cases: TC-INVENTREE-011, TC-INVENTREE-012, TC-INVENTREE-013, TC-SEC-INVENTREE-001, TC-SEC-INVENTREE-002, TC-SEC-INVENTREE-003
 */

const BASE_URL = process.env.INVENTREE_BASE_URL || 'http://localhost:8000';
const VALID_TOKEN = process.env.INVENTREE_API_TOKEN || 'valid_admin_token';
const READONLY_TOKEN = process.env.INVENTREE_READONLY_TOKEN || 'readonly_viewer_token';

test.describe('Part Security & Access Control Suite', () => {
  test('TC-INVENTREE-011: Write operation succeeds with valid Authorization: Token header', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/part/`, {
      headers: {
        Authorization: `Token ${VALID_TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: { name: `Sec_Part_${Date.now()}`, category: 1 }
    });
    expect(res.status()).toBe(201);
  });

  test('TC-INVENTREE-012 / TC-SEC-INVENTREE-001: Missing, malformed, or invalid tokens return 401', async ({ request }) => {
    // 1. Missing Authorization header
    const noHeaderRes = await request.post(`${BASE_URL}/api/part/`, {
      data: { name: 'No_Auth', category: 1 }
    });
    expect(noHeaderRes.status()).toBe(401);
    const noHeaderBody = await noHeaderRes.json();
    expect(JSON.stringify(noHeaderBody)).toContain('Authentication credentials were not provided');

    // 2. Malformed token
    const malformedRes = await request.post(`${BASE_URL}/api/part/`, {
      headers: { Authorization: 'Token !@#$%^&*()' },
      data: { name: 'Malformed', category: 1 }
    });
    expect(malformedRes.status()).toBe(401);
  });

  test('TC-INVENTREE-013 / TC-SEC-INVENTREE-002: Read-only token cannot perform destructive deletion (403 Forbidden)', async ({ request }) => {
    const delRes = await request.delete(`${BASE_URL}/api/part/1/`, {
      headers: { Authorization: `Token ${READONLY_TOKEN}` }
    });
    expect(delRes.status()).toBe(403);
  });

  test('TC-SEC-INVENTREE-003: SQL injection resilience on search parameter', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/part/`, {
      headers: { Authorization: `Token ${VALID_TOKEN}` },
      params: { search: "' OR '1'='1' --" }
    });
    // Must return 200 with literal match or empty results, never 500 server error
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
  });
});

