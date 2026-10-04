import * as fs from 'fs';
import * as path from 'path';

export interface TraceabilityEntry {
  requirementId: string;
  testTitle: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
}

export class TraceabilityMatrix {
  private static entries: TraceabilityEntry[] = [];

  static recordTest(testTitle: string, status: 'passed' | 'failed' | 'skipped', durationMs: number): void {
    const reqMatches = testTitle.match(/\[?(REQ-[a-zA-Z0-9_-]+)\]?/g);
    if (!reqMatches) return;

    for (const rawMatch of reqMatches) {
      const cleanReq = rawMatch.replace(/[\[\]]/g, '');
      this.entries.push({
        requirementId: cleanReq,
        testTitle,
        status,
        durationMs
      });
    }
  }

  static generateReport(outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'traceability-matrix.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.entries, null, 2), 'utf-8');

    const markdownLines: string[] = [
      '# Requirement Traceability Matrix',
      '',
      '| Requirement ID | Test Title | Status | Duration |',
      '| :--- | :--- | :--- | :--- |'
    ];

    for (const entry of this.entries) {
      const statusIcon = entry.status === 'passed' ? 'PASS' : entry.status === 'failed' ? 'FAIL' : 'SKIP';
      markdownLines.push(
        `| **${entry.requirementId}** | ${entry.testTitle} | ${statusIcon} | ${entry.durationMs}ms |`
      );
    }

    const mdPath = path.join(outputDir, 'traceability-matrix.md');
    fs.writeFileSync(mdPath, markdownLines.join('\n'), 'utf-8');
  }

  static getEntries(): TraceabilityEntry[] {
    return this.entries;
  }

  static clear(): void {
    this.entries = [];
  }
}
