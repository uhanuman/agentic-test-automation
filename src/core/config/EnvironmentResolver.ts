import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { VariableStore } from '../variables/VariableStore';
import { ParameterResolver } from '../variables/ParameterResolver';

dotenv.config();

export interface EnvironmentConfig {
  baseUrl: string;
  webBaseUrl: string;
  outputDir?: string;
  authStrategy?: string;
  apiToken?: string;
  emailProvider?: string;
  oktaDomain?: string;
  oktaAudience?: string;
  readOnlySmokeOnly?: boolean;
  defaultTimeoutMs?: number;
  retryCount?: number;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export class EnvironmentResolver {
  private static cachedConfig: EnvironmentConfig | null = null;
  private static resolvedEnv: string | null = null;

  static resolve(envName?: string): EnvironmentConfig {
    const env = (envName || process.env.TEST_ENV || 'qa').toLowerCase();

    if (this.cachedConfig && this.resolvedEnv === env) {
      return this.cachedConfig;
    }

    const configPath = path.resolve(process.cwd(), 'config/environments.config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`[EnvironmentResolver] Config file not found at: ${configPath}`);
    }

    const rawFileContent = fs.readFileSync(configPath, 'utf-8');
    const allConfigs = JSON.parse(rawFileContent);

    const defaults = allConfigs._defaults || {};
    const specific = allConfigs[env];

    if (!specific) {
      throw new Error(
        `[EnvironmentResolver] Environment "${env}" is not defined in config/environments.config.json. Available: ${Object.keys(
          allConfigs
        )
          .filter((k) => k !== '_defaults')
          .join(', ')}`
      );
    }

    const merged = {
      ...defaults,
      ...specific,
      headers: { ...(defaults.headers || {}), ...(specific.headers || {}) }
    };

    const resolved = ParameterResolver.resolveDeep(merged, {
      environment: env,
      allowMissing: true
    }) as EnvironmentConfig;

    if (resolved.baseUrl && !VariableStore.has('baseUrl', 'global')) {
      VariableStore.set('baseUrl', resolved.baseUrl, 'global');
    }
    if (resolved.webBaseUrl) {
      VariableStore.set('webBaseUrl', resolved.webBaseUrl, 'global');
    }
    if (resolved.apiToken && !VariableStore.has('apiToken', 'global')) {
      VariableStore.set('apiToken', resolved.apiToken, 'global');
    }

    const rawOutputDir = resolved.outputDir;
    const resolvedOutputDir =
      rawOutputDir && typeof rawOutputDir === 'string' && !rawOutputDir.startsWith('${')
        ? rawOutputDir
        : (process.env.OUTPUT_DIR || 'output');
    resolved.outputDir = resolvedOutputDir;

    if (!VariableStore.has('outputDir', 'global')) {
      VariableStore.set('outputDir', resolvedOutputDir, 'global');
    }

    this.cachedConfig = resolved;
    this.resolvedEnv = env;
    return resolved;
  }

  static getOutputDir(): string {
    return process.env.OUTPUT_DIR || (this.cachedConfig?.outputDir as string) || 'output';
  }

  static getActiveEnvironment(): string {
    return this.resolvedEnv || (process.env.TEST_ENV || 'qa').toLowerCase();
  }

  static reset(): void {
    this.cachedConfig = null;
    this.resolvedEnv = null;
  }
}
