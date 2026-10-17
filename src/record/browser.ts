/** Starts headless Chromium with sound off, and turns Playwright's install errors into a hint. */
import { chromium, type Browser } from 'playwright';
import { ShowreelError, describe } from '../errors.js';

/** Headless screencasts come at 1x unless the scale is forced at launch, so it is forced here. */
export async function launchBrowser(scale: number): Promise<Browser> {
  const args = ['--mute-audio', '--hide-scrollbars', '--font-render-hinting=none', `--force-device-scale-factor=${String(scale)}`];
  try {
    return await chromium.launch({ headless: true, args });
  } catch (error) {
    const text = describe(error);
    if (/Executable doesn't exist|playwright install/i.test(text)) {
      throw new ShowreelError('Chromium for Playwright is not installed', 'Run: npx playwright install --with-deps chromium', { cause: error });
    }
    throw new ShowreelError(`cannot start Chromium: ${text.split('\n')[0] ?? text}`, 'On Linux, run: npx playwright install-deps chromium', { cause: error });
  }
}

/** Turns a script URL into an absolute one: paths resolve against the served folder or the start URL. */
export function urlResolver(base: string): (url: string) => string {
  return (url) => new URL(url, base).toString();
}
