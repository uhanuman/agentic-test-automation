import * as fs from 'fs';
import * as path from 'path';
import { RuntimeStoreSchema } from '../types';

/**
 * FilePersistenceAdapter (Pattern A: Atomic File Locking)
 * Safely persists runtime data to artifacts/<run-id>/runTimeDataStore.json across multiple
 * parallel Playwright worker processes using OS-level atomic locks ('wx' flag) and atomic renames.
 */
export class FilePersistenceAdapter {
  private static readonly LOCK_TIMEOUT_MS = 5000;
  private static readonly STALE_LOCK_MS = 10000;

  /** Load store file safely */
  static load(filePath: string): RuntimeStoreSchema {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content ? (JSON.parse(content) as RuntimeStoreSchema) : {};
    } catch (err) {
      console.warn(`[FilePersistenceAdapter] Warning: Could not parse "${filePath}":`, err);
      return {};
    }
  }

  /**
   * Atomically updates a key within environment and scope block.
   * Uses atomic lockfile with exponential backoff to eliminate worker write contention.
   */
  static updateKey(
    filePath: string,
    env: string,
    scopeName: string,
    key: string,
    value: unknown
  ): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const lockFd = this.acquireLock(filePath);
    try {
      const currentData = this.load(filePath);
      const envKey = env.toLowerCase();

      if (!currentData[envKey]) {
        currentData[envKey] = {};
      }

      if (!currentData[envKey][scopeName]) {
        currentData[envKey][scopeName] = {};
      }

      currentData[envKey][scopeName]![key] = value;

      // Write atomically via temp file + rename
      const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(currentData, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } finally {
      this.releaseLock(lockFd, filePath);
    }
  }

  /** Acquire exclusive atomic lock using OS-level exclusive file creation ('wx') */
  private static acquireLock(filePath: string): number {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }

    const lockPath = `${filePath}.lock`;
    const start = Date.now();
    let delayMs = 5;

    while (Date.now() - start < this.LOCK_TIMEOUT_MS) {
      try {
        // 'wx' flag creates exclusively; fails atomically with EEXIST if lock exists
        const fd = fs.openSync(lockPath, 'wx');
        return fd;
      } catch (err: any) {
        if (err.code === 'EEXIST' || err.code === 'EPERM' || err.code === 'EBUSY') {
          // Check for stale lock from crashed worker
          try {
            const stats = fs.statSync(lockPath);
            if (Date.now() - stats.mtimeMs > this.STALE_LOCK_MS) {
              fs.unlinkSync(lockPath);
              continue;
            }
          } catch {
            // Lock was likely just removed by holder
          }

          // Sleep synchronously with backoff
          this.sleepSync(delayMs);
          delayMs = Math.min(delayMs * 1.5, 50);
        } else {
          throw err;
        }
      }
    }

    throw new Error(
      `[FilePersistenceAdapter] Timeout acquiring file lock for "${filePath}" after ${this.LOCK_TIMEOUT_MS}ms`
    );
  }

  /** Release atomic lock */
  private static releaseLock(fd: number, filePath: string): void {
    const lockPath = `${filePath}.lock`;
    try {
      fs.closeSync(fd);
    } catch {}
    try {
      if (fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {}
  }

  /** Synchronous sleep without external dependencies */
  private static sleepSync(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }
}
