import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * InvenTree Accessibility (a11y) Automated Audit Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-106
 * Test Cases: TC-A11Y-INVENTREE-003
 */

test.describe('Accessibility Audits (WCAG 2.1 AA)', () => {
  test('TC-A11Y-INVENTREE-003: Parts list page has 0 Critical/Serious accessibility violations', async ({ page }) => {
    await page.goto('/part/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Filter for blocking violations (critical or serious)
    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(seriousViolations).toEqual([]);
  });
});

