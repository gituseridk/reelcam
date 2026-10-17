/** The scenery of a take: every visible piece of the page a viewer could see cut by the frame edge
 *  (text runs, cards, controls, images), sampled every 250 ms. The renderer frames shots so no
 *  piece is cut, and the check fails a video where one is. */
import type { Page } from 'playwright';
import { describe } from '../errors.js';
import { log } from '../log.js';
import { now, sleep, type Item } from '../take.js';

/** Runs in the page: collects the pieces that are on top (not hidden under an overlay). */
function collect(): Item[] {
  const vw = innerWidth;
  const vh = innerHeight;
  const out: Item[] = [];
  const isText = (el: Element): boolean => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
  const textRect = (el: Element): DOMRect => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  };
  const isBox = (el: Element, cs: CSSStyleDeclaration): boolean =>
    ['IMG', 'svg', 'CANVAS', 'VIDEO', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== 'none';
  for (const el of document.body.querySelectorAll('*')) {
    if (out.length >= 400) break;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const text = isText(el);
    if (!text && !isBox(el, cs)) continue;
    const r = text ? textRect(el) : el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.right <= 0 || r.bottom <= 0 || r.left >= vw || r.top >= vh) continue;
    if (r.width >= vw * 0.95 && r.height >= vh * 0.9) continue; // the page itself, a backdrop, a full canvas
    const hit = document.elementFromPoint((Math.max(r.left, 0) + Math.min(r.right, vw)) / 2, (Math.max(r.top, 0) + Math.min(r.bottom, vh)) / 2);
    if (hit === null || !(el.contains(hit) || hit.contains(el))) continue; // under an overlay
    const label = text ? el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) : `${el.tagName.toLowerCase()}${el.id === '' ? '' : `#${el.id}`}`;
    out.push({ kind: text ? 'text' : 'box', label, rect: { x: r.left, y: r.top, width: r.width, height: r.height } });
  }
  return out;
}

/** Samples the scenery every 250 ms, keeping a sample only when it changed; `stop()` returns them. */
export function watchScenery(page: Page): { stop: () => Promise<[number, Item[]][]> } {
  const samples: [number, Item[]][] = [];
  const state = { on: true };
  let last = '';
  const loop = (async (): Promise<void> => {
    while (state.on) {
      const items = await page.evaluate(collect).catch((error: unknown) => {
        log.debug(`scenery sample skipped: ${describe(error)}`);
        return null;
      });
      const key = items === null ? last : JSON.stringify(items);
      if (items !== null && key !== last) samples.push([now(), items]);
      last = key;
      await sleep(250);
    }
  })();
  return {
    stop: async () => {
      state.on = false;
      await loop;
      return samples;
    },
  };
}
