/** Privacy and content guards. `redact` blurs matching elements on every page before the first
 *  frame; `forbid` samples the visible text while recording and logs any match, which fails the take. */
import type { BrowserContext, Page } from 'playwright';
import { describe } from '../errors.js';
import { log } from '../log.js';
import { now, sleep } from '../take.js';
import { installStyle } from './style.js';

/** The CSS that blurs every element matching one of `selectors`. */
export function redactCss(selectors: readonly string[]): string {
  if (selectors.length === 0) return '';
  return `${selectors.join(',\n')} { filter: blur(9px) saturate(0.4) !important; }`;
}

/** Installs the redaction style on every document the context opens (CSP-proof; see style.ts). */
export async function installRedaction(context: Pick<BrowserContext, 'addInitScript'>, selectors: readonly string[]): Promise<void> {
  await installStyle(context, redactCss(selectors));
}

export interface Hit {
  t: number;
  text: string;
  pattern: string;
}

/** The first line of `text` matching each pattern (case-insensitive), skipping patterns already seen. */
export function findHits(text: string, patterns: readonly RegExp[], seen: Set<string>): Omit<Hit, 't'>[] {
  const lines = text.split('\n');
  const hits: Omit<Hit, 't'>[] = [];
  for (const re of patterns) {
    if (seen.has(re.source)) continue;
    const line = lines.find((l) => re.test(l));
    if (line === undefined) continue;
    seen.add(re.source);
    hits.push({ text: line.trim().slice(0, 120), pattern: re.source });
  }
  return hits;
}

/** Samples the page's visible text every 200 ms; `stop()` returns every hit. */
export function watchText(page: Page, sources: readonly string[]): { stop: () => Promise<Hit[]> } {
  const patterns = sources.map((s) => new RegExp(s, 'i'));
  const hits: Hit[] = [];
  let on = patterns.length > 0;
  const seen = new Set<string>();
  const loop = (async (): Promise<void> => {
    while (on) {
      const text = await page.evaluate(() => document.body.innerText).catch((error: unknown) => {
        log.debug(`text sample skipped (page navigating?): ${describe(error)}`);
        return '';
      });
      for (const h of findHits(text, patterns, seen)) hits.push({ t: now(), ...h });
      await sleep(200);
    }
  })();
  return {
    stop: async () => {
      on = false;
      await loop;
      return hits;
    },
  };
}
