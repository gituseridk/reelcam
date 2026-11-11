/** Hides unwanted scenery without moving the rest of the page. */
import type { BrowserContext } from 'playwright';

/** Matching elements and their descendants stay hidden, even if a child sets its own visibility. */
export function excludeCss(selectors: readonly string[]): string {
  if (selectors.length === 0) return '';
  const targets = `:is(${selectors.join(',\n')})`;
  return `${targets},\n${targets} * { visibility: hidden !important; }`;
}

/** Installs the exclusions on every document the context opens, including later visits. */
export async function installExclusion(context: Pick<BrowserContext, 'addInitScript'>, selectors: readonly string[]): Promise<void> {
  const css = excludeCss(selectors);
  if (css === '') return;
  await context.addInitScript((text: string) => {
    const add = (): void => {
      const style = document.createElement('style');
      style.dataset.exclude = '';
      style.textContent = text;
      document.documentElement.append(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, { once: true });
    else add();
  }, css);
}
