export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerConfig {
  globalLevel: LogLevel;
  classOverrides: Record<string, LogLevel>;
}

export class LoggerRegistry {
  private static config: LoggerConfig = {
    globalLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
    classOverrides: {}
  };

  static levelFor(scopeName: string): LogLevel {
    return this.config.classOverrides[scopeName] ?? this.config.globalLevel;
  }

  static setGlobalLevel(level: LogLevel): void {
    this.config.globalLevel = level;
  }

  static overrideScope(scopeName: string, level: LogLevel): void {
    this.config.classOverrides[scopeName] = level;
  }

  static reset(): void {
    this.config = {
      globalLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
      classOverrides: {}
    };
  }
}
