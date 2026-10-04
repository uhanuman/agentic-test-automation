import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export class CryptoUtils {
  private static getKey(): Buffer {
    const rawKey = process.env.QA_CRYPTO_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    return Buffer.from(rawKey.slice(0, 64), 'hex');
  }

  static encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  static decrypt(payload: string): string {
    const key = this.getKey();
    const buf = Buffer.from(payload, 'base64');

    if (buf.length < 28) {
      throw new Error('[CryptoUtils] Invalid encrypted payload: buffer too short');
    }

    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
