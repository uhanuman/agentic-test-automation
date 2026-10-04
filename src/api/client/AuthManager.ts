import { IAuthStrategy } from './strategies/IAuthStrategy';
import { TokenAuthStrategy, BearerTokenStrategy, ApiKeyStrategy } from './strategies/AuthStrategies';

export class AuthManager {
  private static strategies = new Map<string, IAuthStrategy>([
    ['token', new TokenAuthStrategy()],
    ['bearer', new BearerTokenStrategy()],
    ['apikey', new ApiKeyStrategy()]
  ]);

  static register(name: string, strategy: IAuthStrategy): void {
    this.strategies.set(name.toLowerCase(), strategy);
  }

  static getStrategy(name: string = 'token'): IAuthStrategy {
    const strategy = this.strategies.get(name.toLowerCase());
    if (!strategy) {
      throw new Error(`[AuthManager] Unknown authentication strategy: "${name}"`);
    }
    return strategy;
  }

  static async getAuthHeaders(name: string = 'token'): Promise<Record<string, string>> {
    return this.getStrategy(name).getHeaders();
  }
}
