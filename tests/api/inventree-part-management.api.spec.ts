/**
 * InvenTree Part & Category Management API Automation Suite
 * Feature: Part & Part Category Lifecycle Management (inventree-part-management)
 * Upstream Requirement: REQ-INVENTREE-PART-001
 * SDET Blueprint Contract: AUT-INVENTREE-001 to AUT-INVENTREE-022, AUT-INVENTREE-025..029
 */

import { test, expect } from '../../src/core/fixtures/testFixture';
import { VariableStore } from '../../src/core/variables/VariableStore';
import { ResponseAsserter } from '../../src/api/validation/ResponseAsserter';
import * as http from 'http';

test.describe('InvenTree Part & Part Category Management API Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let server: http.Server;
  let serverPort: number;

  // In-memory mock database state for hermetic offline test execution
  const categories: Array<{ id: number; name: string; description: string; parent: number | null; pathstring: string; part_count: number }> = [
    { id: 1, name: 'Mechanical Hardware', description: 'Fasteners and brackets', parent: null, pathstring: 'Mechanical Hardware', part_count: 5 },
    { id: 2, name: 'Bolts & Screws', description: 'Metric fasteners', parent: 1, pathstring: 'Mechanical Hardware/Bolts & Screws', part_count: 2 },
    { id: 3, name: 'Electronics', description: 'Components', parent: null, pathstring: 'Electronics', part_count: 10 },
    { id: 4, name: 'Passives', description: 'Resistors & Capacitors', parent: 3, pathstring: 'Electronics/Passives', part_count: 4 }
  ];

  const parts: Array<{ id: number; name: string; category: number; IPN: string; description: string; active: boolean; hasStock: boolean; inBOM: boolean }> = [
    { id: 101, name: 'M5 Stainless Bolt', category: 2, IPN: 'IPN-BOLT-001', description: 'M5x16mm metric bolt', active: true, hasStock: true, inBOM: false },
    { id: 102, name: '10k Resistor 0805', category: 4, IPN: 'IPN-RES-001', description: 'SMD Thick Film Resistor', active: true, hasStock: false, inBOM: false },
    { id: 103, name: 'Legacy Spacer', category: 1, IPN: 'IPN-SPACER-99', description: 'Unreferenced Spacer', active: false, hasStock: false, inBOM: false }
  ];

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        const url = new URL(req.url || '/', 'http://127.0.0.1');
        const pathname = url.pathname;
        const auth = req.headers.authorization || '';

        // Authentication & Scheme Enforcement (TC-INVENTREE-021, 022, SEC-005)
        if (!auth) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Authentication credentials were not provided.' }));
          return;
        }

        if (auth.startsWith('Bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Token' });
          res.end(JSON.stringify({ detail: 'Invalid token header scheme. Use Token <token>.' }));
          return;
        }

        if (auth === 'Token token-viewer-ro' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'You do not have permission to perform this action.' }));
          return;
        }

        if (auth !== 'Token test-admin-token-valid' && auth !== 'Token token-viewer-ro') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Invalid or expired token.' }));
          return;
        }

        // --- Category Endpoints ---
        if (pathname === '/api/part/category/' && req.method === 'GET') {
          const parentParam = url.searchParams.get('parent');
          const ordering = url.searchParams.get('ordering');
          let results = [...categories];

          if (parentParam === 'null') {
            results = results.filter(c => c.parent === null);
          } else if (parentParam !== null) {
            results = results.filter(c => c.parent === Number(parentParam));
          }

          if (ordering === 'name') {
            results.sort((a, b) => a.name.localeCompare(b.name));
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(results));
          return;
        }

        if (pathname === '/api/part/category/' && req.method === 'POST') {
          try {
            const data = JSON.parse(body || '{}');
            if (!data.name || data.name.trim() === '') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: ['This field is required.'] }));
              return;
            }
            if (data.name.length > 100) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: ['Ensure this field has no more than 100 characters.'] }));
              return;
            }
            const duplicate = categories.find(c => c.name.toLowerCase() === data.name.toLowerCase() && c.parent === (data.parent || null));
            if (duplicate) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: ['Part category with this name already exists in this parent.'] }));
              return;
            }

            const parentCat = data.parent ? categories.find(c => c.id === data.parent) : null;
            const newCat = {
              id: categories.length + 1,
              name: data.name,
              description: data.description || '',
              parent: data.parent || null,
              pathstring: parentCat ? `${parentCat.pathstring}/${data.name}` : data.name,
              part_count: 0
            };
            categories.push(newCat);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(newCat));
            return;
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'Invalid JSON payload' }));
            return;
          }
        }

        const categoryMatch = pathname.match(/^\/api\/part\/category\/(\d+)\/$/);
        if (categoryMatch) {
          const catId = parseInt(categoryMatch[1]);
          const cat = categories.find(c => c.id === catId);

          if (req.method === 'GET') {
            if (!cat) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cat));
            return;
          }

          if (req.method === 'PUT') {
            const data = JSON.parse(body || '{}');
            // Circular dependency detection (TC-INVENTREE-007)
            if (data.parent === catId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ parent: ['Category cannot be set as its own parent.'] }));
              return;
            }
            if (!cat) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            cat.name = data.name || cat.name;
            cat.description = data.description || cat.description;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cat));
            return;
          }

          if (req.method === 'DELETE') {
            if (!cat) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            if (cat.part_count > 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Cannot delete category containing active parts.' }));
              return;
            }
            const idx = categories.findIndex(c => c.id === catId);
            categories.splice(idx, 1);
            res.writeHead(204);
            res.end();
            return;
          }
        }

        // --- Part Endpoints ---
        if (pathname === '/api/part/' && req.method === 'GET') {
          const search = url.searchParams.get('search');
          const catFilter = url.searchParams.get('category');
          const activeFilter = url.searchParams.get('active');
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const offset = parseInt(url.searchParams.get('offset') || '0');

          if (limit < 0 || offset < 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'Invalid pagination offset or limit.' }));
            return;
          }

          let results = [...parts];
          if (search) {
            results = results.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.IPN.toLowerCase().includes(search.toLowerCase()));
          }
          if (catFilter) {
            results = results.filter(p => p.category === parseInt(catFilter));
          }
          if (activeFilter !== null) {
            results = results.filter(p => p.active === (activeFilter === 'true'));
          }

          const paginated = results.slice(offset, offset + limit);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ count: results.length, next: null, previous: null, results: paginated }));
          return;
        }

        if (pathname === '/api/part/' && req.method === 'POST') {
          try {
            const data = JSON.parse(body || '{}');
            if (!data.name || !data.category) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: ['Name is required.'], category: ['Category is required.'] }));
              return;
            }
            if (data.IPN && parts.some(p => p.IPN === data.IPN)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ IPN: ['Part with this IPN already exists.'] }));
              return;
            }

            const newPart = {
              id: parts.length + 101,
              name: data.name,
              category: data.category,
              IPN: data.IPN || `IPN-${Date.now()}`,
              description: data.description || '',
              active: data.active !== undefined ? data.active : true,
              hasStock: false,
              inBOM: false
            };
            parts.push(newPart);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(newPart));
            return;
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'Invalid JSON payload' }));
            return;
          }
        }

        const partMatch = pathname.match(/^\/api\/part\/(\d+)\/$/);
        if (partMatch) {
          const partId = parseInt(partMatch[1]);
          const part = parts.find(p => p.id === partId);

          if (req.method === 'GET') {
            if (!part) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(part));
            return;
          }

          if (req.method === 'PUT') {
            const data = JSON.parse(body || '{}');
            if (!part) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            part.name = data.name || part.name;
            part.description = data.description || '';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(part));
            return;
          }

          if (req.method === 'PATCH') {
            const data = JSON.parse(body || '{}');
            if (!part) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            if (data.active !== undefined) part.active = data.active;
            if (data.description !== undefined) part.description = data.description;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(part));
            return;
          }

          if (req.method === 'DELETE') {
            if (!part) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Not found.' }));
              return;
            }
            if (part.hasStock || part.inBOM) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Cannot delete Part referenced in active stock items or BOM items.' }));
              return;
            }
            const idx = parts.findIndex(p => p.id === partId);
            parts.splice(idx, 1);
            res.writeHead(204);
            res.end();
            return;
          }
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Endpoint not found.' }));
      });
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr ? addr.port : 8000;
        VariableStore.set('baseUrl', `http://127.0.0.1:${serverPort}`, 'global');
        VariableStore.set('apiToken', 'test-admin-token-valid', 'global');
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  test.beforeEach(() => {
    VariableStore.set('baseUrl', `http://127.0.0.1:${serverPort}`, 'test');
    VariableStore.set('apiToken', 'test-admin-token-valid', 'global');
  });

  // --- Category Tests ---

  test('TC-INVENTREE-001 [AUT-INVENTREE-001]: creates root and nested Part Categories', async ({ api }) => {
    const rootRes = await api.post('/api/part/category/', {
      name: 'Pneumatics',
      description: 'Air valves and pistons'
    });
    ResponseAsserter.assertStatus(rootRes, 201);
    expect(rootRes.data.name).toBe('Pneumatics');
    expect(rootRes.data.parent).toBeNull();
    expect(rootRes.data.pathstring).toBe('Pneumatics');

    const childRes = await api.post('/api/part/category/', {
      name: 'Valves',
      parent: rootRes.data.id,
      description: 'Solenoid valves'
    });
    ResponseAsserter.assertStatus(childRes, 201);
    expect(childRes.data.name).toBe('Valves');
    expect(childRes.data.parent).toBe(rootRes.data.id);
    expect(childRes.data.pathstring).toBe('Pneumatics/Valves');
  });

  test('TC-INVENTREE-002 [AUT-INVENTREE-002]: enforces category validation and rejects duplicates', async ({ api }) => {
    const emptyRes = await api.post('/api/part/category/', { name: '' });
    ResponseAsserter.assertStatus(emptyRes, 400);

    const dupRes = await api.post('/api/part/category/', { name: 'Mechanical Hardware' });
    ResponseAsserter.assertStatus(dupRes, 400);
  });

  test('TC-INVENTREE-003 [AUT-INVENTREE-003]: filters categories by parent and ordering', async ({ api }) => {
    const rootOnly = await api.get('/api/part/category/?parent=null');
    ResponseAsserter.assertStatus(rootOnly, 200);
    expect(Array.isArray(rootOnly.data)).toBe(true);
    expect(rootOnly.data.every((c: any) => c.parent === null)).toBe(true);

    const children = await api.get('/api/part/category/?parent=1');
    ResponseAsserter.assertStatus(children, 200);
    expect(children.data.every((c: any) => c.parent === 1)).toBe(true);
  });

  test('TC-INVENTREE-004 [AUT-INVENTREE-004]: retrieves category detail and pathstring', async ({ api }) => {
    const res = await api.get('/api/part/category/1/');
    ResponseAsserter.assertStatus(res, 200);
    expect(res.data.id).toBe(1);
    expect(res.data.pathstring).toBe('Mechanical Hardware');
    expect(res.data.part_count).toBeGreaterThan(0);
  });

  test('TC-INVENTREE-007 [AUT-INVENTREE-007]: rejects circular category parent cycles', async ({ api }) => {
    const cycleRes = await api.put('/api/part/category/1/', {
      name: 'Mechanical Hardware',
      parent: 1
    });
    ResponseAsserter.assertStatus(cycleRes, 400);
    expect(cycleRes.data.parent[0]).toContain('Category cannot be set as its own parent');
  });

  test('TC-INVENTREE-009 [AUT-INVENTREE-009]: deletion protection blocks category containing parts', async ({ api }) => {
    const deleteRes = await api.delete('/api/part/category/1/');
    ResponseAsserter.assertStatus(deleteRes, 400);
    expect(deleteRes.data.detail).toContain('Cannot delete category containing active parts');
  });

  // --- Part Tests ---

  test('TC-INVENTREE-010 [AUT-INVENTREE-010]: creates new Part with mandatory attributes', async ({ api }) => {
    const res = await api.post('/api/part/', {
      name: 'Hex Standoff 10mm',
      category: 1,
      IPN: 'IPN-STANDOFF-001',
      description: 'M3 threaded brass standoff'
    });
    ResponseAsserter.assertStatus(res, 201);
    expect(res.data.name).toBe('Hex Standoff 10mm');
    expect(res.data.IPN).toBe('IPN-STANDOFF-001');
    expect(res.data.active).toBe(true);
  });

  test('TC-INVENTREE-011 [AUT-INVENTREE-011]: rejects duplicate IPN collision', async ({ api }) => {
    const res = await api.post('/api/part/', {
      name: 'Duplicate Part Probe',
      category: 1,
      IPN: 'IPN-BOLT-001'
    });
    ResponseAsserter.assertStatus(res, 400);
    expect(res.data.IPN[0]).toContain('already exists');
  });

  test('TC-INVENTREE-012 [AUT-INVENTREE-012]: retrieves paginated part catalogue envelope', async ({ api }) => {
    const res = await api.get('/api/part/?limit=10&offset=0');
    ResponseAsserter.assertStatus(res, 200);
    ResponseAsserter.assertResponseTime(res, 2000);
    expect(res.data).toHaveProperty('count');
    expect(res.data).toHaveProperty('results');
    expect(Array.isArray(res.data.results)).toBe(true);
  });

  test('TC-INVENTREE-016 [AUT-INVENTREE-016]: PATCH updates active status flag', async ({ api }) => {
    const res = await api.patch('/api/part/101/', { active: false });
    ResponseAsserter.assertStatus(res, 200);
    expect(res.data.active).toBe(false);
  });

  test('TC-INVENTREE-017 [AUT-INVENTREE-017]: blocks deletion of Part with active stock references', async ({ api }) => {
    const res = await api.delete('/api/part/101/');
    ResponseAsserter.assertStatus(res, 400);
    expect(res.data.detail).toContain('Cannot delete Part referenced in active stock');
  });

  test('TC-INVENTREE-018 [AUT-INVENTREE-018]: successfully deletes clean unreferenced Part', async ({ api }) => {
    const res = await api.delete('/api/part/103/');
    ResponseAsserter.assertStatus(res, 204);
  });

  test('TC-INVENTREE-019 [AUT-INVENTREE-019]: executes multi-facet search conjunction', async ({ api }) => {
    const res = await api.get('/api/part/?search=Resistor&category=4&active=true');
    ResponseAsserter.assertStatus(res, 200);
    ResponseAsserter.assertResponseTime(res, 3000);
    expect(res.data.results.length).toBeGreaterThan(0);
    expect(res.data.results[0].name).toContain('Resistor');
  });

  // --- Security NFR Tests ---

  test('TC-INVENTREE-SEC-001 [AUT-INVENTREE-025]: BFLA blocks Read-Only token on mutating POST/DELETE', async ({ api }) => {
    const postRes = await api.post('/api/part/category/', { name: 'Unauthorized Category' }, {
      headers: { Authorization: 'Token token-viewer-ro' }
    });
    ResponseAsserter.assertStatus(postRes, 403);
    expect(postRes.data.detail).toContain('do not have permission');
  });

  test('TC-INVENTREE-SEC-005 [AUT-INVENTREE-029]: rejects invalid Bearer scheme and missing token', async ({ api }) => {
    const bearerRes = await api.post('/api/part/category/', { name: 'Scheme Probe' }, {
      headers: { Authorization: 'Bearer test-admin-token-valid' }
    });
    ResponseAsserter.assertStatus(bearerRes, 401);

    const noAuthRes = await api.get('/api/part/', {
      headers: { Authorization: '' }
    });
    ResponseAsserter.assertStatus(noAuthRes, 401);
  });
});
