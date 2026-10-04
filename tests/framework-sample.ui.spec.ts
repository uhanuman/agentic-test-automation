import { test, expect } from '../src/core/fixtures/testFixture';
import { CaptureOrchestrator } from '../src/web/capture/CaptureOrchestrator';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Enterprise Web/UI Framework Sample Suite', () => {
  test('TC-UI-001 [REQ-UI-FORM-101]: fills form inputs with dynamic variables and verifies text', async ({
    page,
    ui,
    logger
  }) => {
    logger.info('Executing TC-UI-001: Form interaction with parameter interpolation');

    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Order Form</title></head>
        <body>
          <h1>Customer Registration</h1>
          <form id="orderForm">
            <label for="emailInput">Email:</label>
            <input id="emailInput" type="email" />

            <label for="dateInput">Delivery Date:</label>
            <input id="dateInput" type="text" />

            <button id="submitBtn" type="button" onclick="document.getElementById('result').innerText = 'Submitted for ' + document.getElementById('emailInput').value">
              Submit
            </button>
            <div id="result"></div>
          </form>
        </body>
      </html>
    `);

    await ui.fill('#emailInput', '${randomEmail:samplecorp.com}', { description: 'Customer Email' });
    await ui.fill('#dateInput', '${date:+7d}', { description: 'Delivery Date' });
    await ui.click('#submitBtn', { description: 'Submit Button' });

    const resultText = await ui.getText('#result');
    expect(resultText).toContain('Submitted for user_');
    expect(resultText).toContain('@samplecorp.com');
  });

  test('TC-UI-002 [REQ-UI-ACTION-102]: executes fluent ActionBuilder chain for multi-step interactions', async ({
    page,
    createActions,
    ui
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Action Builder Demo</title></head>
        <body>
          <input id="username" type="text" />
          <input id="notes" type="text" />
          <button id="saveBtn" onclick="document.getElementById('status').innerText = 'SAVED'">Save</button>
          <div id="status">PENDING</div>
        </body>
      </html>
    `);

    const actions = createActions(page);

    await actions
      .fill('#username', 'tester_${uuid}')
      .fill('#notes', '${upper:high priority}')
      .click('#saveBtn')
      .waitFor('#status')
      .execute();

    const statusText = await ui.getText('#status');
    expect(statusText).toBe('SAVED');
  });

  test('TC-UI-003 [REQ-UI-A11Y-103]: runs automated accessibility audit via axe-core', async ({
    page,
    logger
  }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Accessible Component</title></head>
        <body>
          <main>
            <h1>Accessible Header</h1>
            <button aria-label="Confirm Action">Confirm</button>
          </main>
        </body>
      </html>
    `);

    const a11yResult = await CaptureOrchestrator.scanAccessibility(page);
    logger.info(`A11y Violations count: ${a11yResult.violations.length}`);
    expect(a11yResult.violations.length).toBe(0);
  });

  test('TC-UI-004 [REQ-UI-CAPTURE-104]: CaptureOrchestrator records screenshots and ARIA accessibility trees', async ({
    page
  }, testInfo) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Capture Test Page</title></head>
        <body>
          <header role="banner"><h1>Application Banner</h1></header>
          <main role="main"><p>Diagnostic Capture Content</p></main>
        </body>
      </html>
    `);

    await CaptureOrchestrator.captureAll(page, testInfo);

    const baseDir = path.resolve(process.cwd(), `artifacts/${process.env.RUN_ID || 'latest'}/captures`);
    expect(fs.existsSync(baseDir)).toBe(true);

    const files = fs.readdirSync(baseDir);
    const hasAria = files.some((f) => f.endsWith('-aria.txt'));
    const hasScreenshot = files.some((f) => f.endsWith('-screenshot.png'));

    expect(hasAria).toBe(true);
    expect(hasScreenshot).toBe(true);
  });
});
