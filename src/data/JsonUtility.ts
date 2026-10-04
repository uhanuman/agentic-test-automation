import { JsonHandler } from '../utils/file/JsonHandler';
import { ParameterResolver } from '../core/variables/ParameterResolver';
import { ResolveOptions } from '../core/variables/types';

export class JsonUtility {
  static read<T = unknown>(filePath: string): T {
    return JsonHandler.read<T>(filePath);
  }

  static write(filePath: string, data: unknown): void {
    JsonHandler.write(filePath, data);
  }

  static merge<T extends Record<string, any>>(
    base: T,
    override: Partial<T>,
    options: { deep?: boolean } = { deep: true }
  ): T {
    if (!options.deep) {
      return { ...base, ...override };
    }
    return this.deepMerge(base, override);
  }

  static update(
    filePath: string,
    patch: Record<string, unknown>,
    options: { deep?: boolean } = { deep: true }
  ): void {
    const current = this.read<Record<string, unknown>>(filePath);
    const updated = this.merge(current, patch, options);
    this.write(filePath, updated);
  }

  static interpolate<T>(data: T, options: ResolveOptions = {}): T {
    return ParameterResolver.resolveDeep(data, options);
  }

  private static deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;

    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        key in target
      ) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }
}
