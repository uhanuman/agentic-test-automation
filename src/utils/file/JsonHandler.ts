import { FileManager } from './FileManager';

export class JsonHandler {
  static read<T = unknown>(filePath: string): T {
    const raw = FileManager.read(filePath);
    return JSON.parse(raw) as T;
  }

  static write(filePath: string, data: unknown): void {
    const content = JSON.stringify(data, null, 2);
    FileManager.write(filePath, content);
  }

  static update<T extends Record<string, unknown>>(
    filePath: string,
    updater: (current: T) => T
  ): void {
    const current = this.read<T>(filePath);
    const updated = updater(current);
    this.write(filePath, updated);
  }
}
