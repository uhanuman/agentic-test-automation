import { ApiResponse } from '../client/ApiClient';
import { SchemaValidator } from './SchemaValidator';

export class ResponseAsserter {
  static assertStatus(res: ApiResponse, expectedStatus: number): void {
    if (res.status !== expectedStatus) {
      throw new Error(
        `[ResponseAsserter] Expected status ${expectedStatus}, received ${res.status} (${res.statusText})\nBody: ${JSON.stringify(
          res.data,
          null,
          2
        )}`
      );
    }
  }

  static assertSchema(res: ApiResponse, schemaOrPath: string | Record<string, unknown>): void {
    SchemaValidator.assertValid(res.data, schemaOrPath);
  }

  static assertResponseTime(res: ApiResponse, maxAllowedMs: number): void {
    if (res.responseTimeMs > maxAllowedMs) {
      throw new Error(
        `[ResponseAsserter] Response time exceeded threshold. Received ${res.responseTimeMs}ms, max allowed: ${maxAllowedMs}ms`
      );
    }
  }

  static assertHeader(
    res: ApiResponse,
    headerName: string,
    expectedPattern: string | RegExp
  ): void {
    const value = res.headers[headerName.toLowerCase()] || res.headers[headerName];
    if (!value) {
      throw new Error(`[ResponseAsserter] Expected header "${headerName}" is missing from response`);
    }

    if (expectedPattern instanceof RegExp) {
      if (!expectedPattern.test(String(value))) {
        throw new Error(
          `[ResponseAsserter] Header "${headerName}" with value "${value}" does not match pattern ${expectedPattern}`
        );
      }
    } else if (String(value) !== expectedPattern) {
      throw new Error(
        `[ResponseAsserter] Header "${headerName}" expected "${expectedPattern}", received "${value}"`
      );
    }
  }
}
