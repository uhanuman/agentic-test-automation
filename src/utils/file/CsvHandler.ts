import { FileManager } from './FileManager';

export class CsvHandler {
  static read(filePath: string): Record<string, string>[] {
    const content = FileManager.read(filePath);
    return this.parseCsv(content);
  }

  static parseCsv(csvText: string): Record<string, string>[] {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const headers = this.parseLine(lines[0]);
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);
      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] !== undefined ? values[j] : '';
      }
      records.push(record);
    }

    return records;
  }

  static write(filePath: string, records: Record<string, string>[]): void {
    if (records.length === 0) {
      FileManager.write(filePath, '');
      return;
    }

    const headers = Object.keys(records[0]);
    const lines: string[] = [headers.join(',')];

    for (const record of records) {
      const line = headers.map((h) => this.escapeCell(record[h] || '')).join(',');
      lines.push(line);
    }

    FileManager.write(filePath, lines.join('\n'));
  }

  private static parseLine(line: string): string[] {
    const result: string[] = [];
    let insideQuotes = false;
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private static escapeCell(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
