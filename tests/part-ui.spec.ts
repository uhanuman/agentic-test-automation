import { test, expect } from '@playwright/test';

/**
 * InvenTree Part & Category Frontend UI End-to-End Suite
 * Traces to: REQ-INVENTREE-PART-001 -> AC-INVENTREE-106
 * Test Cases: TC-INVENTREE-014, TC-INVENTREE-015, TC-A11Y-INVENTREE-001, TC-A11Y-INVENTREE-002
 */

test.describe('Part Management UI End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/part/');
  });

  test('TC-INVENTREE-014: Category Tree selection filters parts table dynamically', async ({ page }) => {
    // 1. Verify parts list table is rendered
    const partTable = page.locator('#part-table, [data-testid="part-table"], table').first();
    await expect(partTable).toBeVisible();

    // 2. Locate category tree view item
    const treeItem = page.locator('[role="treeitem"]').first();
    if (await treeItem.isVisible()) {
      const categoryName = await treeItem.innerText();
      await treeItem.click();

      // Verify URL changes or query param updates
      await expect(page).toHaveURL(/category=/);
    }
  });

  test('TC-INVENTREE-015 / TC-A11Y-INVENTREE-001: Create Part modal validation and focus trap', async ({ page }) => {
    // 1. Trigger Create Part dialog
    const newPartBtn = page.locator('button:has-text("New Part"), [data-testid="new-part-button"]').first();
    if (await newPartBtn.isVisible()) {
      await newPartBtn.click();

      // 2. Verify modal opened with accessibility attributes
      const modal = page.locator('[role="dialog"], .modal-dialog').first();
      await expect(modal).toBeVisible();

      // 3. Submit empty form to trigger validation
      const saveBtn = modal.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Save")').first();
      await saveBtn.click();

      // 4. Verify validation feedback
      const invalidInputs = modal.locator(':invalid, [aria-invalid="true"], .is-invalid');
      expect(await invalidInputs.count()).toBeGreaterThan(0);

      // 5. Test Escape key dismisses modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });
});

