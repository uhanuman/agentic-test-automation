import { VariableStore } from './VariableStore';
import { DateUtils } from '../../utils/date/DateUtils';
import { RandomUtils } from '../../utils/random/RandomUtils';
import { ResolveOptions } from './types';

/**
 * Utility 2: ParameterResolver (Interpolator)
 * STRICTLY GET-only / read-only resolver for test data files, payloads, URLs, and form inputs.
 * Features:
 * - Strictly ${...} syntax (avoids Handlebars/Mustache conflicts).
 * - Resolves values from SOURCES:
 *     - ${test:key} / ${global:key} (reads from VariableStore)
 *     - ${response:path} (API response payload/headers)
 *     - ${data:path} (scenario test data fixtures)
 *     - ${env:VAR} (system process.env)
 *     - ${date:...}, ${uuid}, ${randomInt:...}, etc.
 *     - Computed functions: ${upper:...}, ${lower:...}, ${base64:...}, ${concat:...}
 * - Environment Pivot Resolution: Automatically maps { DEV: 10, QA: 5 } to active env value.
 * - Deep traversal across objects, arrays, and primitives.
 */
export class ParameterResolver {
  // Strictly matches ${token} with innermost resolution
  private static readonly TOKEN_REGEX = /\$\{\s*([^{}]+?)\s*\}/g;

  /**
   * Resolves all ${...} placeholders in a string.
   * Recursively evaluates nested expressions (e.g. ${concat:QA_,${uuid}}).
   */
  static resolve(input: string, options: ResolveOptions = {}): string {
    if (!input || typeof input !== 'string') return input;

    let current = input;
    const maxIterations = 10;
    let iterations = 0;

    while (this.TOKEN_REGEX.test(current) && iterations < maxIterations) {
      this.TOKEN_REGEX.lastIndex = 0;
      let matchedAny = false;

      current = current.replace(this.TOKEN_REGEX, (fullMatch, expr) => {
        matchedAny = true;
        const resolved = this.evaluateToken(expr.trim(), options);

        if (resolved === undefined || resolved === null) {
          if (options.allowMissing) {
            return fullMatch; // Retain token in lenient mode
          }
          const env = options.environment || process.env.TEST_ENV || 'qa';
          throw new Error(
            `[ParameterResolver] Unresolved token "${fullMatch}" in environment "${env}". Set allowMissing: true to suppress.`
          );
        }

        return String(resolved);
      });

      iterations++;
      if (!matchedAny || current === input) break;
    }

    return current;
  }

  /**
   * Resolves a value and preserves native types (number, boolean, object)
   * if the input is exclusively a single placeholder like "${randomInt}" or "${test:id}".
   */
  static resolveValue(input: unknown, options: ResolveOptions = {}): unknown {
    if (typeof input !== 'string') return input;

    const singleMatch = input.trim().match(/^\$\{\s*([^{}]+?)\s*\}$/);
    if (singleMatch) {
      const expr = singleMatch[1].trim();
      const resolved = this.evaluateToken(expr, options);
      if (resolved !== undefined && resolved !== null) {
        return resolved;
      }
      if (options.allowMissing) {
        return input;
      }
      const env = options.environment || process.env.TEST_ENV || 'qa';
      throw new Error(
        `[ParameterResolver] Unresolved token "${input}" in environment "${env}". Set allowMissing: true to suppress.`
      );
    }

    return this.resolve(input, options);
  }

  /**
   * Recursively resolves all string leaves, arrays, objects, and environment pivots.
   */
  static resolveDeep<T>(target: T, options: ResolveOptions = {}): T {
    if (target === null || target === undefined) {
      return target;
    }

    if (typeof target === 'string') {
      return this.resolveValue(target, options) as unknown as T;
    }

    if (Array.isArray(target)) {
      return target.map((item) => this.resolveDeep(item, options)) as unknown as T;
    }

    if (typeof target === 'object') {
      const targetObj = target as Record<string, unknown>;

      // Environment Pivot: Automatically resolve { DEV: 10, QA: 5 }
      if (options.resolveEnvPivots !== false && this.isEnvironmentPivot(targetObj)) {
        const activeEnv = (options.environment || process.env.TEST_ENV || 'qa').toLowerCase();
        const matchingKey = Object.keys(targetObj).find((k) => k.toLowerCase() === activeEnv);
        if (matchingKey !== undefined) {
          return this.resolveDeep(targetObj[matchingKey], options) as T;
        }
      }

      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(targetObj)) {
        result[key] = this.resolveDeep(value, options);
      }
      return result as T;
    }

    return target;
  }

  /**
   * Evaluates a single token expression against namespaced resolvers and priority order.
   */
  private static evaluateToken(expr: string, options: ResolveOptions): unknown {
    // 1. Check Function Transformations
    if (this.isFunctionCall(expr)) {
      return this.executeFunction(expr, options);
    }

    // 2. Check Date namespaces
    if (
      expr.startsWith('date:') ||
      expr.startsWith('datetime:') ||
      expr.startsWith('time:') ||
      expr === 'epoch' ||
      expr === 'epochMillis' ||
      expr === 'year' ||
      expr === 'month' ||
      expr === 'day'
    ) {
      return DateUtils.resolveToken(expr);
    }

    // 3. Check Random / Unique Generators
    if (
      expr.startsWith('random:') ||
      expr === 'uuid' ||
      expr === 'guid' ||
      expr === 'uniqueId' ||
      expr.startsWith('random')
    ) {
      return RandomUtils.resolveToken(expr);
    }

    // 4. Explicit Source Namespaces
    if (expr.startsWith('test:')) {
      return VariableStore.get(expr.slice(5), 'test');
    }
    if (expr.startsWith('global:')) {
      return VariableStore.get(expr.slice(7), 'global');
    }
    if (expr.startsWith('response:')) {
      return this.resolvePath(options.responseContext, expr.slice(9));
    }
    if (expr.startsWith('data:')) {
      return this.resolvePath(options.dataContext, expr.slice(5));
    }
    if (expr.startsWith('env:')) {
      return process.env[expr.slice(4)];
    }

    // 5. Unprefixed Fallback Priority: test -> global -> dataContext -> process.env
    const fromTest = VariableStore.get(expr, 'test');
    if (fromTest !== undefined) return fromTest;

    const fromGlobal = VariableStore.get(expr, 'global');
    if (fromGlobal !== undefined) return fromGlobal;

    const fromData = this.resolvePath(options.dataContext, expr);
    if (fromData !== undefined) return fromData;

    if (process.env[expr] !== undefined) return process.env[expr];

    return undefined;
  }

  private static isEnvironmentPivot(obj: Record<string, unknown>): boolean {
    const keys = Object.keys(obj);
    if (keys.length === 0 || keys.length > 8) return false;
    const knownEnvs = new Set(['dev', 'qa', 'stage', 'staging', 'prod', 'production', 'local', 'test', 'uat']);
    return keys.every((k) => knownEnvs.has(k.toLowerCase()));
  }

  private static resolvePath(obj: any, pathStr: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return pathStr.split('.').reduce((acc, part) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[part];
    }, obj);
  }

  private static isFunctionCall(expr: string): boolean {
    return /^(upper|lower|trim|base64|urlEncode|concat):/.test(expr);
  }

  private static executeFunction(expr: string, options: ResolveOptions): string {
    const colonIndex = expr.indexOf(':');
    const funcName = expr.slice(0, colonIndex);
    const rawArg = expr.slice(colonIndex + 1);

    if (funcName === 'concat') {
      const parts = rawArg.split(',').map((p) => this.resolve(p.trim(), options));
      return parts.join('');
    }

    const resolvedArg = this.resolve(rawArg, options);

    switch (funcName) {
      case 'upper':
        return resolvedArg.toUpperCase();
      case 'lower':
        return resolvedArg.toLowerCase();
      case 'trim':
        return resolvedArg.trim();
      case 'base64':
        return Buffer.from(resolvedArg, 'utf-8').toString('base64');
      case 'urlEncode':
        return encodeURIComponent(resolvedArg);
      default:
        return resolvedArg;
    }
  }
}
