import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentResolver, EnvironmentConfig } from './EnvironmentResolver';

export interface CaptureFlags {
  strictInterpolation: boolean;
  captureNetworkTraffic: boolean;
  captureAriaSnapshots: boolean;
  captureConsoleLogs: boolean;
  captureScreenshotsOnFailure: boolean;
  capturePerformance: boolean;
  captureAccessibility: boolean;
  persistRuntimeStore: boolean;
}

export interface TimeoutsConfig {
  defaultMs: number;
  actionMs: number;
  navigationMs: number;
  assertionMs: number;
  endpoints?: Record<string, number>;
}

export class ConfigManager {
  private static flags: CaptureFlags | null = null;
  private static timeouts: TimeoutsConfig | null = null;

  static getEnvironmentConfig(): EnvironmentConfig {
    return EnvironmentResolver.resolve();
  }

  static getOutputDir(): string {
    return process.env.OUTPUT_DIR || EnvironmentResolver.getOutputDir();
  }

  static getFlags(): CaptureFlags {
    if (!this.flags) {
      const filePath = path.resolve(process.cwd(), 'config/capture.flags.json');
      if (fs.existsSync(filePath)) {
        this.flags = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else {
        this.flags = {
          strictInterpolation: false,
          captureNetworkTraffic: true,
          captureAriaSnapshots: true,
          captureConsoleLogs: true,
          captureScreenshotsOnFailure: true,
          capturePerformance: false,
          captureAccessibility: true,
          persistRuntimeStore: true
        };
      }
    }
    return this.flags!;
  }

  static getTimeouts(): TimeoutsConfig {
    if (!this.timeouts) {
      const filePath = path.resolve(process.cwd(), 'config/timeouts.config.json');
      if (fs.existsSync(filePath)) {
        this.timeouts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } else {
        this.timeouts = {
          defaultMs: 15000,
          actionMs: 10000,
          navigationMs: 30000,
          assertionMs: 5000
        };
      }
    }
    return this.timeouts!;
  }

  static getFlag<K extends keyof CaptureFlags>(key: K): CaptureFlags[K] {
    return this.getFlags()[key];
  }
}
