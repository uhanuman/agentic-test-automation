import { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { Logger } from '../../core/logger/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';

export class CaptureOrchestrator {
  private static logger = new Logger('CaptureOrchestrator');

  static async captureAll(page: Page, testInfo: TestInfo): Promise<void> {
    const runId = process.env.RUN_ID || 'latest';
    const baseDir = path.resolve(process.cwd(), `artifacts/${runId}/captures`);
    const sanitizedTitle = testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const flags = ConfigManager.getFlags();

    if (flags.captureScreenshotsOnFailure) {
      try {
        const screenshotPath = path.join(baseDir, `${sanitizedTitle}-screenshot.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        testInfo.attachments.push({
          name: 'screenshot',
          path: screenshotPath,
          contentType: 'image/png'
        });
        this.logger.info(`[CAPTURE] Saved screenshot: ${screenshotPath}`);
      } catch (err: any) {
        this.logger.warn(`[CAPTURE] Screenshot failed: ${err.message}`);
      }
    }

    if (flags.captureAriaSnapshots) {
      try {
        const ariaSnapshot = await page.locator(':root').ariaSnapshot();
        const ariaPath = path.join(baseDir, `${sanitizedTitle}-aria.txt`);
        fs.writeFileSync(ariaPath, ariaSnapshot, 'utf-8');
        testInfo.attachments.push({
          name: 'aria-snapshot',
          path: ariaPath,
          contentType: 'text/plain'
        });
        this.logger.info(`[CAPTURE] Saved ARIA snapshot: ${ariaPath}`);
      } catch (err: any) {
        this.logger.warn(`[CAPTURE] ARIA snapshot failed: ${err.message}`);
      }
    }
  }

  static async scanAccessibility(page: Page, testInfo?: TestInfo): Promise<{ violations: any[] }> {
    try {
      const results = await new AxeBuilder({ page }).analyze();
      this.logger.info(`[A11Y] Accessibility scan completed. Violations: ${results.violations.length}`);

      if (testInfo && results.violations.length > 0) {
        testInfo.attach('a11y-violations', {
          body: JSON.stringify(results.violations, null, 2),
          contentType: 'application/json'
        });
      }

      return { violations: results.violations };
    } catch (err: any) {
      this.logger.warn(`[A11Y] Accessibility scan failed: ${err.message}`);
      return { violations: [] };
    }
  }
}
