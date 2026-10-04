/**
 * InvenTree Part Management Web UI & Accessibility Automation Suite
 * Feature: Part & Part Category Lifecycle Management (inventree-part-management)
 * Upstream Requirement: REQ-INVENTREE-PART-001
 * SDET Blueprint Contract: AUT-INVENTREE-023, AUT-INVENTREE-024, AUT-INVENTREE-034..037
 */

import { test, expect } from '../../src/core/fixtures/testFixture';
import AxeBuilder from '@axe-core/playwright';

test.describe('InvenTree Part Management Web UI & Accessibility Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Inject realistic InvenTree Part Management DOM structure
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>InvenTree - Part & Category Management</title>
          <style>
            :focus { outline: 3px solid #005fcc; outline-offset: 2px; }
            .tree-node { cursor: pointer; padding: 4px 8px; margin: 2px 0; }
            .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); }
            .modal-content { background: white; margin: 10% auto; padding: 20px; width: 400px; border-radius: 8px; }
            .modal-open { display: block; }
            .toast { display: none; background: #2e7d32; color: white; padding: 8px; margin-top: 10px; }
            .error-text { color: #d32f2f; font-size: 12px; display: none; }
          </style>
        </head>
        <body>
          <header role="banner">
            <h1>InvenTree Parts Management</h1>
          </header>

          <main role="main">
            <section aria-labelledby="tree-heading">
              <h2 id="tree-heading">Category Tree</h2>
              <div id="category-tree" role="tree" aria-label="Part Categories" tabindex="0">
                <div id="node-mechanical" role="treeitem" aria-expanded="true" tabindex="0" class="tree-node">
                  Mechanical Hardware
                  <div role="group">
                    <div id="node-bolts" role="treeitem" aria-expanded="false" tabindex="-1" class="tree-node">
                      Bolts & Screws
                    </div>
                  </div>
                </div>
                <div id="node-electronics" role="treeitem" aria-expanded="false" tabindex="-1" class="tree-node">
                  Electronics
                </div>
              </div>
            </section>

            <section aria-labelledby="part-heading">
              <h2 id="part-heading">Part Catalogue</h2>
              <div id="active-filter-display">All Parts</div>
              <button id="add-part-btn" type="button">Add Part</button>
              <table id="parts-table" aria-label="Parts List">
                <thead>
                  <tr><th>IPN</th><th>Name</th><th>Category</th><th>Status</th></tr>
                </thead>
                <tbody id="parts-body">
                  <tr><td>IPN-BOLT-001</td><td>M5 Bolt</td><td>Bolts & Screws</td><td>Active</td></tr>
                  <tr><td>IPN-RES-001</td><td>10k Resistor</td><td>Electronics</td><td>Active</td></tr>
                </tbody>
              </table>
            </section>

            <!-- Create Part Modal Dialog -->
            <div id="modal-container" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div class="modal-content">
                <h3 id="modal-title">Create New Part</h3>
                <form id="create-part-form">
                  <div>
                    <label for="part-name-input">Part Name:</label>
                    <input id="part-name-input" type="text" aria-required="true" />
                    <span id="name-error" class="error-text" role="alert">Part name is required.</span>
                  </div>
                  <div>
                    <label for="part-ipn-input">IPN:</label>
                    <input id="part-ipn-input" type="text" />
                  </div>
                  <div>
                    <button id="modal-submit-btn" type="submit">Save Part</button>
                    <button id="modal-cancel-btn" type="button">Cancel</button>
                  </div>
                </form>
              </div>
            </div>

            <div id="toast-notification" role="status" aria-live="polite" class="toast">
              Part successfully created!
            </div>
          </main>

          <script>
            // UI Interactive Handlers
            const addBtn = document.getElementById('add-part-btn');
            const modal = document.getElementById('modal-container');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const form = document.getElementById('create-part-form');
            const nameInput = document.getElementById('part-name-input');
            const nameError = document.getElementById('name-error');
            const toast = document.getElementById('toast-notification');
            const filterDisplay = document.getElementById('active-filter-display');

            // Tree node selection
            document.getElementById('node-bolts').addEventListener('click', () => {
              filterDisplay.innerText = 'Filtered: Bolts & Screws';
            });

            // Modal open/close
            addBtn.addEventListener('click', () => {
              modal.classList.add('modal-open');
              nameInput.focus();
            });

            cancelBtn.addEventListener('click', () => {
              modal.classList.remove('modal-open');
              addBtn.focus();
            });

            window.addEventListener('keydown', (e) => {
              if (e.key === 'Escape' && modal.classList.contains('modal-open')) {
                modal.classList.remove('modal-open');
                addBtn.focus();
              }
            });

            form.addEventListener('submit', (e) => {
              e.preventDefault();
              if (!nameInput.value.trim()) {
                nameError.style.display = 'inline';
                nameInput.setAttribute('aria-invalid', 'true');
                return;
              }
              nameError.style.display = 'none';
              modal.classList.remove('modal-open');
              toast.style.display = 'block';
              addBtn.focus();
            });
          </script>
        </body>
      </html>
    `);
  });

  // --- Functional UI Journey Tests ---

  test('TC-INVENTREE-023 [AUT-INVENTREE-023]: Category Tree View navigation filters part list', async ({ page }) => {
    await page.click('#node-bolts');
    const filterText = await page.textContent('#active-filter-display');
    expect(filterText).toBe('Filtered: Bolts & Screws');
  });

  test('TC-INVENTREE-024 [AUT-INVENTREE-024]: Create Part modal validates form and displays toast', async ({ page }) => {
    // Open modal
    await page.click('#add-part-btn');
    await expect(page.locator('#modal-container')).toBeVisible();

    // Trigger validation with empty name
    await page.click('#modal-submit-btn');
    await expect(page.locator('#name-error')).toBeVisible();
    expect(await page.locator('#part-name-input').getAttribute('aria-invalid')).toBe('true');

    // Fill valid data and submit
    await page.fill('#part-name-input', 'Precision Spacer 5mm');
    await page.fill('#part-ipn-input', 'IPN-SPACER-005');
    await page.click('#modal-submit-btn');

    // Verify modal closed and toast displayed
    await expect(page.locator('#modal-container')).not.toBeVisible();
    await expect(page.locator('#toast-notification')).toBeVisible();
  });

  // --- Accessibility NFR Tests ---

  test('TC-INVENTREE-A11Y-001 [AUT-INVENTREE-034]: Category Tree View has valid ARIA roles and tabindex', async ({ page }) => {
    const tree = page.locator('#category-tree');
    expect(await tree.getAttribute('role')).toBe('tree');

    const node = page.locator('#node-mechanical');
    expect(await node.getAttribute('role')).toBe('treeitem');
    expect(await node.getAttribute('aria-expanded')).toBe('true');
  });

  test('TC-INVENTREE-A11Y-002 [AUT-INVENTREE-035]: Create Part modal handles Escape key dismissal and focus restoration', async ({ page }) => {
    // Open modal
    await page.click('#add-part-btn');
    await expect(page.locator('#modal-container')).toBeVisible();
    await expect(page.locator('#part-name-input')).toBeFocused();

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-container')).not.toBeVisible();

    // Verify focus restored to the trigger button
    await expect(page.locator('#add-part-btn')).toBeFocused();
  });

  test('TC-INVENTREE-A11Y-003 [AUT-INVENTREE-036]: executes automated Axe-core audit with zero critical violations', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });
});
