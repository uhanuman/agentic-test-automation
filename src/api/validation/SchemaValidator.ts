import Ajv, { ValidateFunction } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

export interface SchemaValidationResult {
  valid: boolean;
  errors?: string[];
}

export class SchemaValidator {
  private static ajv = new Ajv({ allErrors: true, strict: false });
  private static cache = new Map<string, ValidateFunction>();

  static validate(data: unknown, schemaOrPath: string | Record<string, unknown>): SchemaValidationResult {
    let validateFn: ValidateFunction;

    if (typeof schemaOrPath === 'string') {
      const resolvedPath = path.isAbsolute(schemaOrPath)
        ? schemaOrPath
        : path.resolve(process.cwd(), schemaOrPath);

      if (this.cache.has(resolvedPath)) {
        validateFn = this.cache.get(resolvedPath)!;
      } else {
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`[SchemaValidator] Schema file not found: ${resolvedPath}`);
        }
        const schemaContent = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
        validateFn = this.ajv.compile(schemaContent);
        this.cache.set(resolvedPath, validateFn);
      }
    } else {
      validateFn = this.ajv.compile(schemaOrPath);
    }

    const valid = validateFn(data) as boolean;
    if (valid) {
      return { valid: true };
    }

    const errors = (validateFn.errors || []).map(
      (err) => `Path "${err.instancePath || '/'}" ${err.message}`
    );

    return { valid: false, errors };
  }

  static assertValid(data: unknown, schemaOrPath: string | Record<string, unknown>): void {
    const result = this.validate(data, schemaOrPath);
    if (!result.valid) {
      throw new Error(
        `[SchemaValidator] Schema validation failed:\n  - ${result.errors?.join('\n  - ')}`
      );
    }
  }
}
