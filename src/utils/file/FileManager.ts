import * as fs from 'fs';
import * as path from 'path';

export interface DiffResult {
  equal: boolean;
  message?: string;
}

export class FileManager {
  private static readonly ROOT_DIR = process.cwd();

  static resolveSafePath(targetPath: string): string {
    const resolved = path.isAbsolute(targetPath)
      ? path.normalize(targetPath)
      : path.resolve(this.ROOT_DIR, targetPath);

    if (!resolved.startsWith(this.ROOT_DIR)) {
      throw new Error(`[FileManager] Access Denied: Path outside project sandbox: ${targetPath}`);
    }
    return resolved;
  }

  static read(filePath: string): string {
    const safePath = this.resolveSafePath(filePath);
    return fs.readFileSync(safePath, 'utf-8');
  }

  static write(filePath: string, content: string): void {
    const safePath = this.resolveSafePath(filePath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, content, 'utf-8');
  }

  static append(filePath: string, content: string): void {
    const safePath = this.resolveSafePath(filePath);
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(safePath, content, 'utf-8');
  }

  static delete(filePath: string): void {
    const safePath = this.resolveSafePath(filePath);
    if (fs.existsSync(safePath)) {
      fs.rmSync(safePath, { recursive: true, force: true });
    }
  }

  static exists(filePath: string): boolean {
    try {
      const safePath = this.resolveSafePath(filePath);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }

  static compare(pathA: string, pathB: string): DiffResult {
    const contentA = this.read(pathA).trim();
    const contentB = this.read(pathB).trim();

    if (contentA === contentB) {
      return { equal: true };
    }

    if (pathA.endsWith('.json') && pathB.endsWith('.json')) {
      try {
        const jsonA = JSON.parse(contentA);
        const jsonB = JSON.parse(contentB);
        const equal = JSON.stringify(jsonA) === JSON.stringify(jsonB);
        return { equal, message: equal ? undefined : 'JSON contents differ' };
      } catch {}
    }

    return { equal: false, message: 'File contents differ' };
  }
}
