/**
 * Date generation and formatting utility for dynamic test data interpolation.
 * Supports date offsets (+5d, -10d, +2m, +1y), legacy TODAY tokens, and custom formatting.
 */

export type DateUnit = 'd' | 'w' | 'm' | 'y';

export class DateUtils {
  private static readonly DEFAULT_DATE_FORMAT = 'yyyy-MM-dd';

  /** Shift base date by given amount and unit */
  static shift(base: Date, amount: number, unit: DateUnit): Date {
    const d = new Date(base.getTime());
    switch (unit) {
      case 'd':
        d.setDate(d.getDate() + amount);
        break;
      case 'w':
        d.setDate(d.getDate() + amount * 7);
        break;
      case 'm':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'y':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    return d;
  }

  /** Return formatted date in the future */
  static future(amount: number, unit: DateUnit, format = this.DEFAULT_DATE_FORMAT): string {
    return this.format(this.shift(new Date(), amount, unit), format);
  }

  /** Return formatted date in the past */
  static past(amount: number, unit: DateUnit, format = this.DEFAULT_DATE_FORMAT): string {
    return this.format(this.shift(new Date(), -amount, unit), format);
  }

  /** Formats a date using pattern tokens: yyyy, yy, MM, M, dd, d, HH, mm, ss, SSS */
  static format(date: Date, pattern = this.DEFAULT_DATE_FORMAT): string {
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const millis = date.getMilliseconds();

    return pattern
      .replace(/yyyy/g, String(year))
      .replace(/yy/g, String(year).slice(-2))
      .replace(/MM/g, pad(month))
      .replace(/\bM\b/g, String(month))
      .replace(/dd/g, pad(day))
      .replace(/\bd\b/g, String(day))
      .replace(/HH/g, pad(hours))
      .replace(/mm/g, pad(minutes))
      .replace(/ss/g, pad(seconds))
      .replace(/SSS/g, pad(millis, 3));
  }

  /**
   * Resolves date/time tokens:
   * - `date:today`, `date:yesterday`, `date:tomorrow`
   * - `date:+5d`, `date:-10d`, `date:+2m`, `date:+1y` (optional format suffix: `date:+5d:yyyyMMdd`)
   * - Legacy tokens: `TODAY`, `TODAY+10`, `TODAY-20`, `TODAY+365`
   * - `datetime:now`, `time:now`, `epoch`, `epochMillis`, `year`, `month`, `day`
   */
  static resolveToken(token: string): string {
    const now = new Date();

    // 1. Direct keywords
    if (token === 'date:today' || token === 'TODAY') {
      return this.format(now, this.DEFAULT_DATE_FORMAT);
    }
    if (token === 'date:yesterday') {
      return this.past(1, 'd', this.DEFAULT_DATE_FORMAT);
    }
    if (token === 'date:tomorrow') {
      return this.future(1, 'd', this.DEFAULT_DATE_FORMAT);
    }
    if (token === 'datetime:now') {
      return now.toISOString();
    }
    if (token === 'time:now') {
      return this.format(now, 'HH:mm:ss');
    }
    if (token === 'epoch') {
      return String(Math.floor(now.getTime() / 1000));
    }
    if (token === 'epochMillis') {
      return String(now.getTime());
    }
    if (token === 'year') {
      return String(now.getFullYear());
    }
    if (token === 'month') {
      return String(now.getMonth() + 1).padStart(2, '0');
    }
    if (token === 'day') {
      return String(now.getDate()).padStart(2, '0');
    }

    // 2. Legacy TODAY+N / TODAY-N (e.g. TODAY+10, TODAY-20)
    const legacyMatch = token.match(/^TODAY([+-]\d+)$/i);
    if (legacyMatch) {
      const days = parseInt(legacyMatch[1], 10);
      return this.format(this.shift(now, days, 'd'), this.DEFAULT_DATE_FORMAT);
    }

    // 3. Offset tokens: date:+5d, date:-10d, date:+2m, date:+1y, optionally with format: date:+5d:yyyy/MM/dd
    if (token.startsWith('date:')) {
      const parts = token.slice(5).split(':');
      const offsetSpec = parts[0];
      const customFormat = parts[1] || this.DEFAULT_DATE_FORMAT;

      if (offsetSpec === 'today') return this.format(now, customFormat);
      if (offsetSpec === 'yesterday') return this.past(1, 'd', customFormat);
      if (offsetSpec === 'tomorrow') return this.future(1, 'd', customFormat);

      const offsetMatch = offsetSpec.match(/^([+-]\d+)([dwmy])$/);
      if (offsetMatch) {
        const amount = parseInt(offsetMatch[1], 10);
        const unit = offsetMatch[2] as DateUnit;
        return this.format(this.shift(now, amount, unit), customFormat);
      }
    }

    throw new Error(`[DateUtils] Unsupported date token: "${token}"`);
  }
}

