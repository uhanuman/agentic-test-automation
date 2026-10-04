import { IAuthStrategy } from './IAuthStrategy';
import { VariableStore } from '../../../core/variables/VariableStore';

export class TokenAuthStrategy implements IAuthStrategy {
  constructor(private tokenKey: string = 'apiToken') {}

  async getHeaders(): Promise<Record<string, string>> {
    const token = VariableStore.get<string>(this.tokenKey, 'global') || process.env.INVENTREE_API_TOKEN || '';
    return {
      Authorization: `Token ${token}`
    };
  }
}

export class BearerTokenStrategy implements IAuthStrategy {
  constructor(private tokenKey: string = 'bearerToken') {}

  async getHeaders(): Promise<Record<string, string>> {
    const token = VariableStore.get<string>(this.tokenKey, 'global') || '';
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export class ApiKeyStrategy implements IAuthStrategy {
  constructor(private headerName: string = 'x-api-key', private keyVar: string = 'apiKey') {}

  async getHeaders(): Promise<Record<string, string>> {
    const key = VariableStore.get<string>(this.keyVar, 'global') || '';
    return {
      [this.headerName]: key
    };
  }
}
