/** Text sprites (the title pill and captions) are drawn by the browser, so any font the system has
 *  works, then saved as transparent PNGs for the renderer to place. */
import type { Browser } from 'playwright';
import type { Preset } from '../presets/index.js';

function pillHtml(text: string, preset: Preset): string {
  const { background, color, fontSize } = preset.caption;
  const escaped = text.replace(/[&<>"]/g, (c) => `&#${String(c.charCodeAt(0))};`);
  const css = [
    'html,body{margin:0;background:transparent}',
    `#pill{display:inline-block;max-width:${String(preset.width - 160)}px;padding:${String(fontSize * 0.42)}px ${String(fontSize * 0.9)}px;`,
    `border-radius:${String(fontSize * 1.2)}px;background:${background};color:${color};`,
    `font:600 ${String(fontSize)}px/1.3 Inter,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;letter-spacing:-0.01em}`,
  ].join('');
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><div id="pill">${escaped}</div>`;
}

/** Renders each text as a PNG at output scale; returns the files in the same order. */
export async function renderSprites(browser: Browser, preset: Preset, items: readonly { text: string; file: string }[]): Promise<void> {
  if (items.length === 0) return;
  const page = await browser.newPage({ viewport: { width: preset.width, height: 400 }, deviceScaleFactor: 1 });
  try {
    for (const item of items) {
      await page.setContent(pillHtml(item.text, preset));
      await page.locator('#pill').screenshot({ path: item.file, omitBackground: true });
    }
  } finally {
    await page.close();
  }
}
