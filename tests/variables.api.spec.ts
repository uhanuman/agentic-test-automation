import { test, expect } from '../src/core/fixtures/testFixture';
import { VariableStore, ParameterResolver, DateUtils, RandomUtils } from '../src/core/variables';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Runtime Data Store & Parameter Resolver Suite', () => {
  const testArtifactDir = path.resolve(__dirname, '../artifacts/run-test-101');
  const testStoreFile = path.join(testArtifactDir, 'runTimeDataStore.json');

  test.beforeAll(() => {
    fs.mkdirSync(testArtifactDir, { recursive: true });

    VariableStore.initialize({
      runId: 'run-test-101',
      environment: 'qa',
      storeFilePath: testStoreFile
    });
  });

  test.describe('1. DateUtils & RandomUtils Generators', () => {
    test('DateUtils resolves offsets and formatting', () => {
      const today = DateUtils.resolveToken('date:today');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const offsetDate = DateUtils.resolveToken('date:+5d');
      expect(offsetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const customFormatted = DateUtils.resolveToken('date:today:yyyyMMdd');
      expect(customFormatted).toMatch(/^\d{8}$/);

      const epoch = DateUtils.resolveToken('epoch');
      expect(Number(epoch)).toBeGreaterThan(1700000000);

      const timeNow = DateUtils.resolveToken('time:now');
      expect(timeNow).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test('RandomUtils resolves dynamic tokens', () => {
      const uuid = RandomUtils.resolveToken('uuid');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const randInt = Number(RandomUtils.resolveToken('randomInt:100:200'));
      expect(randInt).toBeGreaterThanOrEqual(100);
      expect(randInt).toBeLessThanOrEqual(200);

      const randString = RandomUtils.resolveToken('randomString:10');
      expect(randString).toHaveLength(10);

      const email = RandomUtils.resolveToken('randomEmail:myorg.com');
      expect(email).toContain('@myorg.com');

      const phone = RandomUtils.resolveToken('randomPhone');
      expect(phone).toMatch(/^\+1555\d{7}$/);
    });
  });

  test.describe('2. Utility 1: VariableStore (Runtime Data Handling)', () => {
    test('manages test scope and global scope with cascading fallback', ({ variables }) => {
      variables.set('authToken', 'GLOBAL_TOKEN_123', 'global');
      variables.set('orderId', 'ORD-4455', 'test');

      // Test scope resolution
      expect(variables.get('orderId', 'test')).toBe('ORD-4455');
      expect(variables.get('orderId')).toBe('ORD-4455');

      // Global scope resolution
      expect(variables.get('authToken', 'global')).toBe('GLOBAL_TOKEN_123');
      expect(variables.get('authToken')).toBe('GLOBAL_TOKEN_123');

      // Test scope overrides global scope for same key
      variables.set('status', 'GLOBAL_ACTIVE', 'global');
      variables.set('status', 'TEST_PENDING', 'test');
      expect(variables.get('status')).toBe('TEST_PENDING');
      expect(variables.get('status', 'global')).toBe('GLOBAL_ACTIVE');
    });

    test('AsyncLocalStorage isolates test executions', async () => {
      const branch1 = VariableStore.runInTestContext(async () => {
        VariableStore.set('isolatedKey', 'worker1_val', 'test');
        await new Promise((r) => setTimeout(r, 20));
        return VariableStore.get('isolatedKey');
      });

      const branch2 = VariableStore.runInTestContext(async () => {
        VariableStore.set('isolatedKey', 'worker2_val', 'test');
        await new Promise((r) => setTimeout(r, 10));
        return VariableStore.get('isolatedKey');
      });

      const [val1, val2] = await Promise.all([branch1, branch2]);
      expect(val1).toBe('worker1_val');
      expect(val2).toBe('worker2_val');
    });

    test('Pattern A: Atomic File Locking handles concurrent worker writes safely', async () => {
      // Simulate 10 simultaneous workers writing to the same runTimeDataStore.json file
      const promises = Array.from({ length: 10 }).map((_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            VariableStore.set(`parallelKey_${i}`, `value_${i}`, 'global');
            VariableStore.set(`testKey_${i}`, `result_${i}`, 'test', `spec-${i}`);
            resolve();
          }, Math.floor(Math.random() * 20));
        });
      });

      await Promise.all(promises);

      // Verify file exists and all 10 worker writes succeeded without corruption or lost updates
      expect(fs.existsSync(testStoreFile)).toBe(true);
      const storeData = JSON.parse(fs.readFileSync(testStoreFile, 'utf-8'));
      expect(storeData.qa).toBeDefined();

      for (let i = 0; i < 10; i++) {
        expect(storeData.qa.global[`parallelKey_${i}`]).toBe(`value_${i}`);
        expect(storeData.qa[`test:spec-${i}`][`testKey_${i}`]).toBe(`result_${i}`);
      }
    });
  });

  test.describe('3. Utility 2: ParameterResolver (Source Token Resolver)', () => {
    test('strictly resolves ${...} placeholders from sources (test, global, response, data, env)', ({ variables }) => {
      process.env.TEST_BASE_URL = 'https://api.qa.org';
      variables.set('sessionToken', 'SECURE_TOKEN_XYZ', 'global');
      variables.set('createdPartId', 991, 'test');

      const dataContext = {
        users: {
          admin: { email: 'admin@system.com' }
        }
      };

      const responseContext = {
        payload: {
          orderNumber: 'ORD-7766'
        }
      };

      const template = 'URL=${env:TEST_BASE_URL} | Token=${global:sessionToken} | Part=${test:createdPartId} | Email=${data:users.admin.email} | Order=${response:payload.orderNumber}';
      const resolved = ParameterResolver.resolve(template, {
        dataContext,
        responseContext
      });

      expect(resolved).toBe(
        'URL=https://api.qa.org | Token=SECURE_TOKEN_XYZ | Part=991 | Email=admin@system.com | Order=ORD-7766'
      );
    });

    test('executes transformation functions (upper, lower, trim, base64, urlEncode, concat)', () => {
      expect(ParameterResolver.resolve('${upper:test value}')).toBe('TEST VALUE');
      expect(ParameterResolver.resolve('${lower:ALL_CAPS}')).toBe('all_caps');
      expect(ParameterResolver.resolve('${trim:   spaced out   }')).toBe('spaced out');
      expect(ParameterResolver.resolve('${base64:admin:pass}')).toBe('YWRtaW46cGFzcw==');
      expect(ParameterResolver.resolve('${urlEncode:search term & more}')).toBe('search%20term%20%26%20more');

      // Nested function resolution
      const nested = ParameterResolver.resolve('${concat:ENV_,${upper:qa}}');
      expect(nested).toBe('ENV_QA');
    });

    test('resolveDeep handles nested structures and environment pivot objects', ({ variables }) => {
      variables.set('currentPartId', 105, 'test');

      const payload = {
        name: 'Part-${currentPartId}',
        quantity: 50,
        tags: ['TAG-1', '${date:today}'],
        // Environment pivot dictionary
        customerId: {
          DEV: 'DEV-CUST-10',
          QA: 'QA-CUST-50',
          STAGE: 'STG-CUST-20'
        }
      };

      const resolved = ParameterResolver.resolveDeep(payload, { environment: 'QA' });

      expect(resolved.name).toBe('Part-105');
      expect(resolved.quantity).toBe(50);
      expect(resolved.tags[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Environment pivot successfully collapsed to active environment value
      expect(resolved.customerId).toBe('QA-CUST-50');
    });

    test('handles missing keys in strict mode (throw) vs lenient mode (allowMissing: true)', () => {
      const template = 'Hello ${missingUser}, your part is ${missingPart}';

      // Strict mode throws
      expect(() => ParameterResolver.resolve(template, { allowMissing: false })).toThrowError(
        /Unresolved token/
      );

      // Lenient mode retains token
      const lenient = ParameterResolver.resolve(template, { allowMissing: true });
      expect(lenient).toBe('Hello ${missingUser}, your part is ${missingPart}');
    });
  });
});
