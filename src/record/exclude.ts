/** Hides unwanted scenery without moving the rest of the page. */
import type { BrowserContext } from 'playwright';
import { installStyle } from './style.js';

/** Matching elements and their descendants stay hidden, even if a child sets its own visibility. */
export function excludeCss(selectors: readonly string[]): string {
  if (selectors.length === 0) return '';
  const targets = `:is(${selectors.join(',\n')})`;
  return `${targets},\n${targets} * { visibility: hidden !important; }`;
}

/** Installs the exclusions on every document the context opens, later visits included (CSP-proof; see style.ts). */
export async function installExclusion(context: Pick<BrowserContext, 'addInitScript'>, selectors: readonly string[]): Promise<void> {
  await installStyle(context, excludeCss(selectors));
}
