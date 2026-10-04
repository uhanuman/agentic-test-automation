import { test, expect } from '../src/core/fixtures/testFixture';
import { VariableStore } from '../src/core/variables/VariableStore';
import { ParameterResolver } from '../src/core/variables/ParameterResolver';
import { ResponseAsserter } from '../src/api/validation/ResponseAsserter';
import { SchemaValidator } from '../src/api/validation/SchemaValidator';
import { CsvDataProvider } from '../src/data/providers/CsvDataProvider';
import { JsonUtility } from '../src/data/JsonUtility';
import { FileManager } from '../src/utils/file/FileManager';
import * as http from 'http';
import * as path from 'path';

test.describe('Enterprise API Framework Sample Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let server: http.Server;
  let serverPort: number;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const url = req.url || '';
        const auth = req.headers.authorization || '';

        if (!auth.startsWith('Token ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ detail: 'Authentication credentials were not provided.' }));
          return;
        }

        if (req.method === 'POST' && url === '/api/part/') {
          try {
            const parsed = JSON.parse(body || '{}');
            if (!parsed.name) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: ['This field is required.'] }));
              return;
            }
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                id: 1045,
                name: parsed.name,
                category: parsed.category || 1,
                IPN: parsed.IPN || 'IPN-DEFAULT',
                description: parsed.description || '',
                active: true
              })
            );
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ detail: 'Invalid JSON payload' }));
          }
          return;
        }

        if (req.method === 'GET' && url === '/api/part/1045/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 1045,
              name: 'Resilient_Bracket_Part',
              category: 1,
              IPN: 'IPN-BRACKET-99',
              description: 'Stainless bracket',
              active: true
            })
          );
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Not found.' }));
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr ? addr.port : 8000;
        VariableStore.set('baseUrl', `http://127.0.0.1:${serverPort}`, 'global');
        VariableStore.set('apiToken', 'mock_secret_token_123', 'global');
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test.beforeEach(() => {
    VariableStore.set('baseUrl', `http://127.0.0.1:${serverPort}`, 'test');
    VariableStore.set('apiToken', 'mock_secret_token_123', 'global');
  });

  test('TC-API-001 [REQ-API-PART-001]: POST /api/part/ creates part with dynamic parameters and schema validation', async ({
    api,
    variables,
    logger
  }) => {
    logger.info('Executing TC-API-001: POST /api/part/');

    const payload = {
      name: 'Bolt_M5_${uuid}',
      category: 1,
      IPN: 'IPN-BOLT-${date:today}',
      description: 'Dynamic part generated on ${date:today}'
    };

    const res = await api.post('/api/part/', payload);

    ResponseAsserter.assertStatus(res, 201);
    ResponseAsserter.assertResponseTime(res, 1000);
    ResponseAsserter.assertHeader(res, 'content-type', /application\/json/);

    ResponseAsserter.assertSchema(res, 'src/data/schemas/part.schema.json');

    variables.set('createdPartId', res.data.id, 'test');
    expect(variables.get('createdPartId')).toBe(1045);
  });

  test('TC-API-002 [REQ-API-SCHEMA-002]: GET /api/part/{id} retrieves part using chained VariableStore data', async ({
    api,
    variables
  }) => {
    variables.set('targetPartId', 1045, 'test');

    const res = await api.get('/api/part/${test:targetPartId}/');

    ResponseAsserter.assertStatus(res, 200);
    ResponseAsserter.assertSchema(res, 'src/data/schemas/part.schema.json');
    expect(res.data.id).toBe(1045);
    expect(res.data.active).toBe(true);
  });

  test('TC-API-003 [REQ-API-NEGATIVE-003]: POST /api/part/ rejects missing required fields with HTTP 400', async ({
    api
  }) => {
    const invalidPayload = {
      category: 1,
      description: 'Missing mandatory name'
    };

    const res = await api.post('/api/part/', invalidPayload);

    ResponseAsserter.assertStatus(res, 400);
    expect(res.data.name).toBeDefined();
    expect(res.data.name[0]).toBe('This field is required.');
  });

  test('TC-API-004 [REQ-DATA-TRANSPOSED-004]: loads transposed CSV test data and resolves dynamic dates', () => {
    const csvPath = 'test-data/csv/create-claim.csv';
    const scenarios = CsvDataProvider.loadResolvedScenarios(csvPath);

    expect(scenarios.scenario_happy_path).toBeDefined();
    expect(scenarios.scenario_happy_path.firstName).toBe('Jane');
    expect(scenarios.scenario_happy_path.claimAmount).toBe('500');
    expect(scenarios.scenario_happy_path.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scenarios.scenario_missing_dob.dateOfBirth).toBe('');
  });

  test('TC-API-005 [REQ-DATA-PIVOT-005]: loads scenario JSON fixture with environment pivot resolution', () => {
    const jsonPath = 'test-data/json/sample-order.json';
    const rawData = JsonUtility.read(jsonPath);

    const resolvedQA = JsonUtility.interpolate(rawData, { environment: 'QA' }) as any;
    expect(resolvedQA.customerId).toBe(202);
    expect(resolvedQA.orderRef).toMatch(/^ORD-[0-9a-f-]+$/);
    expect(resolvedQA.notes).toBe('URGENT DELIVERY');

    const resolvedDEV = JsonUtility.interpolate(rawData, { environment: 'DEV' }) as any;
    expect(resolvedDEV.customerId).toBe(101);
  });

  test('TC-API-006 [REQ-FILE-DIFF-006]: sandboxed FileManager reads, writes, and compares files', () => {
    const testFileA = 'artifacts/latest/sample-compare-a.json';
    const testFileB = 'artifacts/latest/sample-compare-b.json';

    FileManager.write(testFileA, JSON.stringify({ key: 'val1' }));
    FileManager.write(testFileB, JSON.stringify({ key: 'val1' }));

    const compareRes = FileManager.compare(testFileA, testFileB);
    expect(compareRes.equal).toBe(true);

    FileManager.delete(testFileA);
    FileManager.delete(testFileB);
    expect(FileManager.exists(testFileA)).toBe(false);
  });
});
