import { Page, Locator } from '@playwright/test';
import { PlaywrightWrapper } from './PlaywrightWrapper';

type ActionStep = (wrapper: PlaywrightWrapper) => Promise<void>;

export class ActionBuilder {
  private steps: ActionStep[] = [];
  private wrapper: PlaywrightWrapper;

  constructor(page: Page) {
    this.wrapper = new PlaywrightWrapper(page);
  }

  click(locatorOrSelector: Locator | string, description?: string): this {
    this.steps.push(async (w) => {
      await w.click(locatorOrSelector, { description });
    });
    return this;
  }

  fill(locatorOrSelector: Locator | string, value: string, description?: string): this {
    this.steps.push(async (w) => {
      await w.fill(locatorOrSelector, value, { description });
    });
    return this;
  }

  selectOption(locatorOrSelector: Locator | string, value: string): this {
    this.steps.push(async (w) => {
      await w.selectOption(locatorOrSelector, value);
    });
    return this;
  }

  waitFor(locatorOrSelector: Locator | string, timeoutMs?: number): this {
    this.steps.push(async (w) => {
      await w.waitForVisible(locatorOrSelector, timeoutMs);
    });
    return this;
  }

  async execute(): Promise<void> {
    for (const step of this.steps) {
      await step(this.wrapper);
    }
  }
}
