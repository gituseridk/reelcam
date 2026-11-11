/** The scenery of a take: every visible piece of the page a viewer could see cut by the frame edge
 *  (text runs, cards, controls, images; see collect.ts), sampled every 250 ms. The renderer frames
 *  shots so no piece is cut, and the check fails a video where one is. */
import type { Page } from 'playwright';
import { describe } from '../errors.js';
import { log } from '../log.js';
import { now, sleep, type Item } from '../take.js';
import { COLLECT, VISIT_BUDGET, parseCollected } from './collect.js';

/** One sample, or null when the page could not be read (it is navigating, say). */
async function sample(page: Page, warned: { truncated: boolean }): Promise<Item[] | null> {
  try {
    const { items, truncated } = parseCollected(await page.evaluate(COLLECT));
    if (truncated && !warned.truncated) log.warn(`the page has more than ${String(VISIT_BUDGET)} visible elements; the neighbour check sees only the first ones`);
    warned.truncated ||= truncated;
    return items;
  } catch (error) {
    log.debug(`scenery sample skipped: ${describe(error)}`);
    return null;
  }
}

/** Samples the scenery every 250 ms, keeping a sample only when it changed; `stop()` returns them. */
export function watchScenery(page: Page): { stop: () => Promise<[number, Item[]][]> } {
  const samples: [number, Item[]][] = [];
  const state = { on: true };
  let last = '';
  const warned = { truncated: false };
  const loop = (async (): Promise<void> => {
    while (state.on) {
      const items = await sample(page, warned);
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
