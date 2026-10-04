import { AsyncLocalStorage } from 'async_hooks';
import * as path from 'path';
import { WritableScope, RuntimeStoreConfig } from './types';
import { FilePersistenceAdapter } from './adapters/FilePersistenceAdapter';

/**
 * Utility 1: VariableStore (Runtime Data Store)
 * STRICTLY handles runtime/dynamic data during execution.
 * Destinations for SET & GET:
 * - 'test': Isolated per test via AsyncLocalStorage (step-to-step data within a test).
 * - 'global': Shared run-wide (tokens, base URLs, cookies).
 * Persists safely across concurrent Playwright workers to artifacts/<run-id>/runTimeDataStore.json.
 */
export class VariableStore {
  private static asyncLocalStorage = new AsyncLocalStorage<Map<string, unknown>>();
  private static fallbackTestMap = new Map<string, Map<string, unknown>>();
  private static globalStore = new Map<string, unknown>();

  // Configuration & Persistence
  private static currentEnv: string = (process.env.TEST_ENV || 'qa').toLowerCase();
  private static storeFilePath: string = path.resolve(
    process.cwd(),
    `artifacts/${process.env.RUN_ID || 'latest'}/runTimeDataStore.json`
  );

  /** Configure store environment and artifact output path */
  static initialize(config: RuntimeStoreConfig): void {
    if (config.environment) {
      this.currentEnv = config.environment.toLowerCase();
    }
    if (config.storeFilePath) {
      this.storeFilePath = config.storeFilePath;
    } else if (config.runId) {
      this.storeFilePath = path.resolve(
        process.cwd(),
        `artifacts/${config.runId}/runTimeDataStore.json`
      );
    }
  }

  /**
   * Run an asynchronous function within an isolated test context.
   * Ensures variables set with scope 'test' are isolated to this execution branch.
   */
  static runInTestContext<R>(fn: () => R, initialData?: Record<string, unknown>): R {
    const store = new Map<string, unknown>();
    if (initialData) {
      for (const [k, v] of Object.entries(initialData)) {
        store.set(k, v);
      }
    }
    return this.asyncLocalStorage.run(store, fn);
  }

  /**
   * Store runtime data in 'test' or 'global' scope.
   * Automatically persists to artifacts/<run-id>/runTimeDataStore.json using atomic file locking.
   */
  static set(key: string, value: unknown, scope: WritableScope = 'test', testId?: string): void {
    if (scope === 'test') {
      const alsStore = this.asyncLocalStorage.getStore();
      if (alsStore && !testId) {
        alsStore.set(key, value);
      } else {
        const id = testId || 'current-test';
        if (!this.fallbackTestMap.has(id)) {
          this.fallbackTestMap.set(id, new Map());
        }
        this.fallbackTestMap.get(id)!.set(key, value);
      }
    } else {
      this.globalStore.set(key, value);
    }

    // Persist to runTimeDataStore.json
    const scopeIdentifier = scope === 'test' ? (testId ? `test:${testId}` : 'test:current') : 'global';
    FilePersistenceAdapter.updateKey(
      this.storeFilePath,
      this.currentEnv,
      scopeIdentifier,
      key,
      value
    );
  }

  /**
   * Retrieve runtime data. If scope is not specified, cascades:
   * test -> global
   */
  static get<T = unknown>(key: string, scope?: WritableScope, testId?: string): T | undefined {
    if (scope === 'test') {
      return this.getFromTest<T>(key, testId);
    }
    if (scope === 'global') {
      return this.globalStore.get(key) as T;
    }

    // Cascade: test first, then global
    return this.getFromTest<T>(key, testId) ?? (this.globalStore.get(key) as T);
  }

  private static getFromTest<T>(key: string, testId?: string): T | undefined {
    const alsStore = this.asyncLocalStorage.getStore();
    if (alsStore && !testId) {
      return alsStore.get(key) as T;
    }
    const id = testId || 'current-test';
    return this.fallbackTestMap.get(id)?.get(key) as T;
  }

  /** Check if a key exists in specified or any scope */
  static has(key: string, scope?: WritableScope, testId?: string): boolean {
    return this.get(key, scope, testId) !== undefined;
  }

  /** Clear test-specific memory */
  static clearTestScope(testId?: string): void {
    if (testId) {
      this.fallbackTestMap.delete(testId);
    } else {
      const alsStore = this.asyncLocalStorage.getStore();
      if (alsStore) alsStore.clear();
      this.fallbackTestMap.clear();
    }
  }

  /** Clear global store */
  static clearGlobalScope(): void {
    this.globalStore.clear();
  }

  /** Clear all in-memory stores */
  static clearAll(): void {
    this.clearTestScope();
    this.clearGlobalScope();
  }

  /** Get current target store file path */
  static getStoreFilePath(): string {
    return this.storeFilePath;
  }

  /** Set current store file path */
  static setStoreFilePath(filePath: string): void {
    this.storeFilePath = filePath;
  }
}
