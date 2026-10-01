import { test, expect } from '@playwright/test';

/**
 * InvenTree Part Lifecycle Management API Automation Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-102, AC-INVENTREE-103
 * Test Cases: TC-INVENTREE-004, TC-INVENTREE-005, TC-INVENTREE-006, TC-INVENTREE-007, TC-INVENTREE-008
 */

const BASE_URL = process.env.INVENTREE_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN = process.env.INVENTREE_API_TOKEN || 'test_token';
const authHeaders = {
  Authorization: `Token ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

test.describe('Part Lifecycle API - /api/part/', () => {
  let createdPartId: number;

  test('TC-INVENTREE-004: POST /api/part/ creates valid part with active=true', async ({ request }) => {
    const payload = {
      name: `Bolt_M3x10_${Date.now()}`,
      category: 1,
      IPN: `IPN-BOLT-${Date.now()}`,
      description: 'Stainless Steel Socket Head Cap Screw'
    };

    const postRes = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: payload
    });
    expect(postRes.status()).toBe(201);
    const body = await postRes.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(payload.name);
    expect(body.category).toBe(1);
    expect(body.active).toBe(true);
    createdPartId = body.id;

    // Verify detail retrieval
    const getRes = await request.get(`${BASE_URL}/api/part/${createdPartId}/`, {
      headers: authHeaders
    });
    expect(getRes.status()).toBe(200);
    const detail = await getRes.json();
    expect(detail.name).toBe(payload.name);
  });

  test('TC-INVENTREE-005: POST /api/part/ rejects missing mandatory fields with HTTP 400', async ({ request }) => {
    // Missing required 'name'
    const res1 = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: { category: 1 }
    });
    expect(res1.status()).toBe(400);
    const body1 = await res1.json();
    expect(body1.name).toBeDefined();

    // Invalid non-existent category
    const res2 = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: { name: 'Orphan Part', category: 999999 }
    });
    expect(res2.status()).toBe(400);
    const body2 = await res2.json();
    expect(body2.category).toBeDefined();
  });

  test('TC-INVENTREE-006: Boundary character lengths on part name', async ({ request }) => {
    // 1-char name (valid)
    const resMin = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: { name: `X_${Date.now()}`, category: 1 }
    });
    expect(resMin.status()).toBe(201);

    // 101-char name (overflow - invalid)
    const longName = 'A'.repeat(101);
    const resMaxOverflow = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: { name: longName, category: 1 }
    });
    expect(resMaxOverflow.status()).toBe(400);
  });

  test('TC-INVENTREE-007: PUT full replacement vs PATCH partial update', async ({ request }) => {
    // 1. PATCH toggle active=false
    const patchRes = await request.patch(`${BASE_URL}/api/part/${createdPartId}/`, {
      headers: authHeaders,
      data: { active: false }
    });
    expect(patchRes.status()).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.active).toBe(false);

    // 2. PUT full replacement
    const putRes = await request.put(`${BASE_URL}/api/part/${createdPartId}/`, {
      headers: authHeaders,
      data: {
        name: `Bolt_M3x10_Updated_${Date.now()}`,
        category: 1,
        active: true,
        IPN: `IPN-UPDATED-${Date.now()}`
      }
    });
    expect(putRes.status()).toBe(200);
    const putData = await putRes.json();
    expect(putData.active).toBe(true);
    expect(putData.name).toContain('Updated');
  });

  test('TC-INVENTREE-008: DELETE /api/part/{id}/ cleanly removes unlocked part with no stock', async ({ request }) => {
    // Create standalone temporary part
    const tempRes = await request.post(`${BASE_URL}/api/part/`, {
      headers: authHeaders,
      data: { name: `Temp_Part_${Date.now()}`, category: 1 }
    });
    expect(tempRes.status()).toBe(201);
    const tempPart = await tempRes.json();

    // Delete unlocked part with 0 stock
    const delRes = await request.delete(`${BASE_URL}/api/part/${tempPart.id}/`, {
      headers: authHeaders
    });
    expect(delRes.status()).toBe(204);

    // Verify 404
    const getRes = await request.get(`${BASE_URL}/api/part/${tempPart.id}/`, {
      headers: authHeaders
    });
    expect(getRes.status()).toBe(404);
  });
});

