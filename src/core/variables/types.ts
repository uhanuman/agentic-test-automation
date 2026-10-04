/**
 * Type Definitions for Runtime Data Store and Parameter Resolver
 */

export type WritableScope = 'test' | 'global';

export interface RuntimeStoreConfig {
  /** Identifier for current test run (e.g. timestamp or CI build ID) */
  runId?: string;
  /** Active environment (e.g. 'dev', 'qa', 'stage'). Defaults to process.env.TEST_ENV or 'qa' */
  environment?: string;
  /** Target file path for runTimeDataStore.json. Defaults to artifacts/<run-id>/runTimeDataStore.json */
  storeFilePath?: string;
}

export interface ResolveOptions {
  /** If true, unresolvable tokens will remain unchanged in the string instead of throwing */
  allowMissing?: boolean;
  /** Scenario test data context object for ${data:path} */
  dataContext?: Record<string, unknown>;
  /** API response context object for ${response:path} */
  responseContext?: Record<string, unknown>;
  /** Active environment name override */
  environment?: string;
  /** Automatically resolve environment-pivot dictionaries like { DEV: 10, QA: 5 } */
  resolveEnvPivots?: boolean;
}

export interface RuntimeStoreSchema {
  [environment: string]: {
    global?: Record<string, unknown>;
    [testKey: string]: Record<string, unknown> | undefined;
  };
}
