/** The in-page scenery walk on a page shaped like the chat that failed review: a full-height
 *  sidebar, a scrolled and masked system-prompt preview, and pieces that are hidden or clipped. */
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COLLECT, parseCollected } from '../src/record/collect.js';
import type { Item } from '../src/take.js';

const CHAT = `<!doctype html><style>
  body { margin: 0; display: flex; height: 100vh; overflow: hidden; font: 14px sans-serif; background: #111; color: #eee; }
  aside { width: 240px; height: 100vh; background: #222; }
  main { flex: 1; position: relative; }
  #preview { position: absolute; left: 170px; top: 44px; width: 700px; height: 80px; overflow: auto;
             -webkit-mask-image: linear-gradient(#000, transparent); mask-image: linear-gradient(#000, transparent); }
  #preview p { margin: 0; height: 40px; }
  #gone { display: none; } #ghost { visibility: hidden; } #faded { opacity: 0; }
  #shut { position: absolute; top: 300px; left: 20px; width: 200px; height: 0; overflow: hidden; }
</style>
<aside><button id="new">New chat</button></aside>
<main>
  <div id="preview">${Array.from({ length: 30 }, (_, i) => `<p>line ${String(i)} of the system prompt</p>`).join('')}</div>
  <p id="gone">gone</p><p id="ghost">ghost</p><div id="faded"><p>faded</p></div>
  <div id="shut"><p>folded away</p></div>
  <div id="card" style="position:absolute;top:400px;left:100px;width:300px;height:80px;background:#333">Message</div>
</main>`;

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
});

afterAll(async () => {
  await browser.close();
});

async function collect(html: string, scroll = 0): Promise<{ items: Item[]; truncated: boolean }> {
  await page.setContent(html);
  await page.evaluate((y) => document.querySelector('#preview')?.scrollTo(0, y), scroll);
  return parseCollected(await page.evaluate(COLLECT));
}

const labelled = (items: Item[], text: string): Item[] => items.filter((it) => it.label.includes(text));

describe('the scenery walk', () => {
  it('cuts text scrolled inside an app scroller to the scroller, and drops lines scrolled out of it', async () => {
    const { items } = await collect(CHAT, 400);
    expect(labelled(items, 'line 0 ')).toEqual([]); // scrolled out above the preview
    const shown = items.filter((it) => it.label.startsWith('line'));
    expect(shown.length).toBeGreaterThan(0);
    for (const it of shown) {
      expect(it.rect.y).toBeGreaterThanOrEqual(44 - 0.5);
      expect(it.rect.y + it.rect.height).toBeLessThanOrEqual(124 + 0.5);
    }
  });

  it('treats a full-height sidebar as page chrome, but keeps what is in it', async () => {
    const { items } = await collect(CHAT);
    expect(items.filter((it) => it.label === 'aside')).toEqual([]);
    expect(labelled(items, 'New chat')).toHaveLength(1);
    expect(labelled(items, 'Message')).toHaveLength(1);
  });

  it('skips hidden, transparent and fully clipped pieces', async () => {
    const { items } = await collect(CHAT);
    for (const text of ['gone', 'ghost', 'faded', 'folded away']) expect(labelled(items, text)).toEqual([]);
  });

  it('sees a piece after hundreds of hidden elements (no early element cap)', async () => {
    const hidden = `<div style="display:none">${'<span>x</span>'.repeat(3000)}</div>`;
    const clipped = `<div style="height:0;overflow:hidden">${'<b>y</b>'.repeat(3000)}</div>`;
    const { items, truncated } = await collect(`<body>${hidden}${clipped}<button>Last</button></body>`);
    expect(truncated).toBe(false);
    expect(items.map((it) => it.label)).toContain('Last');
  });

  it('reports when a page has more visible elements than the budget', async () => {
    const { truncated } = await collect(`<body>${'<p>z</p>'.repeat(9000)}</body>`);
    expect(truncated).toBe(true);
  });
});
