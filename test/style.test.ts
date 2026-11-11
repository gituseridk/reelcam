/** Redaction and exclusion in a real browser, on a page with a strict Content-Security-Policy
 *  (no inline styles), like the chat app in the launch review: a <style> tag was dropped there. */
import { chromium, type Browser, type BrowserContext } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installExclusion } from '../src/record/exclude.js';
import { installRedaction } from '../src/record/guard.js';

const PAGE = '<!doctype html><p id="secret">token</p><div class="intro"><button>New chat</button></div>';
let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
});

async function strictPage(context: BrowserContext): Promise<ReturnType<BrowserContext['newPage']>> {
  const page = await context.newPage();
  await page.route('http://app.localhost/', (route) =>
    route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': "default-src 'self'" }, body: PAGE }),
  );
  await page.goto('http://app.localhost/');
  return page;
}

describe('our CSS on a page with a strict CSP', () => {
  it('blurs redacted and hides excluded elements', async () => {
    const context = await browser.newContext();
    await installRedaction(context, ['#secret']);
    await installExclusion(context, ['.intro button']);
    const page = await strictPage(context);
    expect(await page.$eval('#secret', (el) => getComputedStyle(el).filter)).toContain('blur');
    expect(await page.$eval('.intro button', (el) => getComputedStyle(el).visibility)).toBe('hidden');
    await context.close();
  });
});
