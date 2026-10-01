import { test, expect } from '@playwright/test';

/**
 * InvenTree Part Category API Automation Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-101
 * Test Cases: TC-INVENTREE-001, TC-INVENTREE-002, TC-INVENTREE-003
 */

const BASE_URL = process.env.INVENTREE_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN = process.env.INVENTREE_API_TOKEN || 'test_token';
const authHeaders = {
  Authorization: `Token ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

test.describe('Part Category API - /api/part/category/', () => {
  let createdRootId: number;
  let createdChildId: number;

  test('TC-INVENTREE-001: Create root category and nested subcategory', async ({ request }) => {
    // 1. Create root category (parent = null)
    const rootName = `Mech_Root_${Date.now()}`;
    const rootRes = await request.post(`${BASE_URL}/api/part/category/`, {
      headers: authHeaders,
      data: { name: rootName, parent: null, description: 'Root mechanical components category' }
    });
    expect(rootRes.status()).toBe(201);
    const rootData = await rootRes.json();
    expect(rootData.id).toBeDefined();
    expect(rootData.name).toBe(rootName);
    expect(rootData.parent).toBeNull();
    createdRootId = rootData.id;

    // 2. Create child subcategory
    const childName = `Fasteners_${Date.now()}`;
    const childRes = await request.post(`${BASE_URL}/api/part/category/`, {
      headers: authHeaders,
      data: { name: childName, parent: createdRootId }
    });
    expect(childRes.status()).toBe(201);
    const childData = await childRes.json();
    expect(childData.parent).toBe(createdRootId);
    createdChildId = childData.id;

    // 3. Verify category detail and pathstring
    const detailRes = await request.get(`${BASE_URL}/api/part/category/${createdChildId}/`, {
      headers: authHeaders
    });
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();
    expect(detail.pathstring).toContain(rootName);
  });

  test('TC-INVENTREE-002: Reject circular parent category assignment with HTTP 400', async ({ request }) => {
    // Attempt setting parent of root category to child category
    const res = await request.put(`${BASE_URL}/api/part/category/${createdRootId}/`, {
      headers: authHeaders,
      data: { name: 'Attempted Cycle', parent: createdChildId }
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/parent|circular|invalid/i);
  });

  test('TC-INVENTREE-003: Reject deletion of non-empty category with HTTP 400/409', async ({ request }) => {
    // Root category contains createdChildId, so deletion without cascade must fail
    const delRes = await request.delete(`${BASE_URL}/api/part/category/${createdRootId}/`, {
      headers: authHeaders
    });
    expect([400, 409]).toContain(delRes.status());

    // Verify root category still exists
    const getRes = await request.get(`${BASE_URL}/api/part/category/${createdRootId}/`, {
      headers: authHeaders
    });
    expect(getRes.status()).toBe(200);
  });
});

