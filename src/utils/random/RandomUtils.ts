import * as crypto from 'crypto';

/**
 * Random and unique value generation utilities for test data.
 * Supports UUID, random ints/ranges, random strings, emails, and phone numbers.
 */
export class RandomUtils {
  /** Generate a standard UUID v4 */
  static uuid(): string {
    return crypto.randomUUID();
  }

  /** Framework-generated unique identifier with optional prefix */
  static uniqueId(prefix = 'id'): string {
    const timestamp = Date.now().toString(36);
    const rand = crypto.randomBytes(3).toString('hex');
    return `${prefix}_${timestamp}_${rand}`;
  }

  /** Generate random integer in range [min, max] inclusive */
  static randomInt(min = 1000, max = 9999): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Generate a random large integer (long) */
  static randomLong(): number {
    return Math.floor(Math.random() * 900000000000) + 100000000000;
  }

  /** Generate random lowercase alpha string */
  static randomString(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  /** Generate random letters (mixed case) */
  static randomAlpha(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  /** Generate random alphanumeric string */
  static randomAlphaNum(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  /** Generate random email address */
  static randomEmail(domain = 'test.com'): string {
    return `user_${this.randomAlphaNum(6).toLowerCase()}@${domain}`;
  }

  /** Generate random 10-digit phone number */
  static randomPhone(prefix = '555'): string {
    const num = Math.floor(Math.random() * 9000000) + 1000000;
    return `+1${prefix}${num}`;
  }

  /** Generate random boolean */
  static randomBoolean(): boolean {
    return Math.random() >= 0.5;
  }

  /**
   * Resolves random/unique placeholder tokens:
   * - `uuid`, `guid`
   * - `uniqueId`
   * - `randomInt`, `randomInt:min:max`
   * - `randomLong`
   * - `randomString`, `randomString:len`
   * - `randomAlpha`, `randomAlpha:len`
   * - `randomAlphaNum`, `randomAlphaNum:len`
   * - `randomEmail`, `randomEmail:domain.com`
   * - `randomPhone`
   * - `randomBoolean`
   */
  static resolveToken(token: string): string {
    if (token === 'uuid' || token === 'guid' || token === 'random:uuid') {
      return this.uuid();
    }
    if (token === 'uniqueId' || token === 'random:uniqueId') {
      return this.uniqueId();
    }
    if (token === 'randomInt' || token === 'random:int') {
      return String(this.randomInt());
    }
    if (token.startsWith('randomInt:')) {
      const parts = token.split(':');
      const min = parseInt(parts[1], 10);
      const max = parseInt(parts[2], 10);
      return String(this.randomInt(min, max));
    }
    if (token === 'randomLong' || token === 'random:long') {
      return String(this.randomLong());
    }
    if (token === 'randomString' || token === 'random:string') {
      return this.randomString();
    }
    if (token.startsWith('randomString:')) {
      const len = parseInt(token.split(':')[1], 10);
      return this.randomString(len);
    }
    if (token === 'randomAlpha' || token === 'random:alpha') {
      return this.randomAlpha();
    }
    if (token.startsWith('randomAlpha:')) {
      const len = parseInt(token.split(':')[1], 10);
      return this.randomAlpha(len);
    }
    if (token === 'randomAlphaNum' || token === 'random:alphaNum') {
      return this.randomAlphaNum();
    }
    if (token.startsWith('randomAlphaNum:')) {
      const len = parseInt(token.split(':')[1], 10);
      return this.randomAlphaNum(len);
    }
    if (token === 'randomEmail' || token === 'random:email') {
      return this.randomEmail();
    }
    if (token.startsWith('randomEmail:')) {
      const domain = token.split(':')[1];
      return this.randomEmail(domain);
    }
    if (token === 'randomPhone' || token === 'random:phone') {
      return this.randomPhone();
    }
    if (token === 'randomBoolean' || token === 'random:boolean') {
      return String(this.randomBoolean());
    }

    throw new Error(`[RandomUtils] Unsupported random token: "${token}"`);
  }
}

