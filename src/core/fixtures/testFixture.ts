import { test as base, expect, Page } from '@playwright/test';
import { VariableStore } from '../variables/VariableStore';
import { ApiClient } from '../../api/client/ApiClient';
import { PlaywrightWrapper } from '../../web/base/PlaywrightWrapper';
import { ActionBuilder } from '../../web/base/ActionBuilder';
import { Logger } from '../logger/Logger';
import { CaptureOrchestrator } from '../../web/capture/CaptureOrchestrator';
import { TraceabilityMatrix } from '../../reporting/TraceabilityMatrix';
import { EnvironmentResolver } from '../config/EnvironmentResolver';

/**
 * Enterprise Playwright test fixture integrating:
 * - VariableStore with automatic AsyncLocalStorage isolation
 * - Pre-configured ApiClient
 * - Resilient PlaywrightWrapper & ActionBuilder
 * - Automatic failure capture (screenshots, ARIA, logs)
 * - Automatic requirement traceability recording
 */
export const test = base.extend<{
  variables: typeof VariableStore;
  api: ApiClient;
  ui: PlaywrightWrapper;
  createActions: (page: Page) => ActionBuilder;
  logger: Logger;
  autoCapture: void;
}>({
  variables: async ({}, use, testInfo) => {
    // Ensure environment is resolved for this test
    EnvironmentResolver.resolve();

    await VariableStore.runInTestContext(async () => {
      VariableStore.set('__testTitle', testInfo.title, 'test');
      VariableStore.set('__testId', testInfo.testId, 'test');

      await use(VariableStore);

      VariableStore.clearTestScope();
    });
  },

  api: async ({}, use) => {
    const client = new ApiClient();
    await use(client);
  },

  ui: async ({ page }, use) => {
    const wrapper = new PlaywrightWrapper(page);
    await use(wrapper);
  },

  createActions: async ({}, use) => {
    await use((page: Page) => new ActionBuilder(page));
  },

  logger: async ({}, use, testInfo) => {
    const log = new Logger(testInfo.title);
    await use(log);
  },

  autoCapture: [
    async ({ page }, use, testInfo) => {
      const startTime = Date.now();
      await use();
      const duration = Date.now() - startTime;

      // On failure, capture evidence (screenshot, ARIA tree)
      if (testInfo.status !== testInfo.expectedStatus && page) {
        await CaptureOrchestrator.captureAll(page, testInfo);
      }

      // Record traceability metrics
      const status =
        testInfo.status === testInfo.expectedStatus
          ? 'passed'
          : testInfo.status === 'timedOut'
          ? 'failed'
          : 'failed';
      TraceabilityMatrix.recordTest(testInfo.title, status, duration);
    },
    { auto: true }
  ]
});

export { expect };

