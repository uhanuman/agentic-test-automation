import pino from 'pino';
import { LoggerRegistry } from './LoggerRegistry';

export class Logger {
  private readonly instance: pino.Logger;

  constructor(private readonly scope: string) {
    this.instance = pino({
      level: LoggerRegistry.levelFor(scope),
      base: { scope },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          'password',
          'token',
          'secret',
          'authorization',
          'apiKey',
          'headers.authorization',
          'headers.Authorization',
          '*.password',
          '*.token',
          '*.secret'
        ],
        censor: '[REDACTED]'
      }
    });
  }

  info(msg: string, meta?: Record<string, unknown>): void {
    if (meta) this.instance.info(meta, msg);
    else this.instance.info(msg);
  }

  warn(msg: string, meta?: Record<string, unknown>): void {
    if (meta) this.instance.warn(meta, msg);
    else this.instance.warn(msg);
  }

  error(msg: string, meta?: Record<string, unknown>): void {
    if (meta) this.instance.error(meta, msg);
    else this.instance.error(msg);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    if (meta) this.instance.debug(meta, msg);
    else this.instance.debug(msg);
  }

  trace(msg: string, meta?: Record<string, unknown>): void {
    if (meta) this.instance.trace(meta, msg);
    else this.instance.trace(msg);
  }
}
