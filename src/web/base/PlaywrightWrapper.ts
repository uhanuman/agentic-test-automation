import { Page, Locator } from '@playwright/test';
import { ParameterResolver } from '../../core/variables/ParameterResolver';
import { Logger } from '../../core/logger/Logger';

export interface ActionOptions {
  timeoutMs?: number;
  retries?: number;
  description?: string;
}

export class PlaywrightWrapper {
  private logger = new Logger('PlaywrightWrapper');

  constructor(private page: Page) {}

  async click(locatorOrSelector: Locator | string, options: ActionOptions = {}): Promise<void> {
    const loc = this.resolveLocator(locatorOrSelector);
    const desc = options.description || `Click on ${loc}`;
    const retries = options.retries ?? 2;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`[UI ACTION] ${desc} (attempt ${attempt + 1})`);
        await loc.click({ timeout: options.timeoutMs ?? 10000 });
        return;
      } catch (err: any) {
        if (attempt === retries) {
          this.logger.error(`[UI FAILED] ${desc}: ${err.message}`);
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
  }

  async fill(
    locatorOrSelector: Locator | string,
    value: string,
    options: ActionOptions = {}
  ): Promise<void> {
    const loc = this.resolveLocator(locatorOrSelector);
    const resolvedValue = ParameterResolver.resolve(value);
    const desc = options.description || `Fill ${loc}`;
    const retries = options.retries ?? 2;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`[UI ACTION] ${desc} with value "${resolvedValue}" (attempt ${attempt + 1})`);
        await loc.fill(resolvedValue, { timeout: options.timeoutMs ?? 10000 });
        return;
      } catch (err: any) {
        if (attempt === retries) {
          this.logger.error(`[UI FAILED] ${desc}: ${err.message}`);
          throw err;
        }
        await this.page.waitForTimeout(500);
      }
    }
  }

  async selectOption(
    locatorOrSelector: Locator | string,
    value: string,
    options: ActionOptions = {}
  ): Promise<void> {
    const loc = this.resolveLocator(locatorOrSelector);
    const resolvedValue = ParameterResolver.resolve(value);
    await loc.selectOption(resolvedValue, { timeout: options.timeoutMs ?? 10000 });
  }

  async waitForVisible(locatorOrSelector: Locator | string, timeoutMs: number = 10000): Promise<void> {
    const loc = this.resolveLocator(locatorOrSelector);
    await loc.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  async getText(locatorOrSelector: Locator | string): Promise<string> {
    const loc = this.resolveLocator(locatorOrSelector);
    const text = await loc.innerText();
    return text.trim();
  }

  async goto(url: string, timeoutMs: number = 30000): Promise<void> {
    const resolvedUrl = ParameterResolver.resolve(url);
    this.logger.info(`[UI NAV] Navigating to: ${resolvedUrl}`);
    await this.page.goto(resolvedUrl, { timeout: timeoutMs });
  }

  private resolveLocator(locatorOrSelector: Locator | string): Locator {
    return typeof locatorOrSelector === 'string'
      ? this.page.locator(locatorOrSelector)
      : locatorOrSelector;
  }
}
