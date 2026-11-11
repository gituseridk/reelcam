/** Records one take: opens the page headless, plays the steps while a screencast captures frames,
 *  and writes the take (frames, pointer, shots, captions) for the renderer. */
import path from 'node:path';
import type { Browser, Page } from 'playwright';
import { log } from '../log.js';
import type { Preset } from '../presets/index.js';
import type { LoadedScript } from '../script/load.js';
import { now, type Take } from '../take.js';
import { Actor } from './actor.js';
import { launchBrowser, urlResolver } from './browser.js';
import { Director } from './director.js';
import { installExclusion } from './exclude.js';
import { closeFrames, freshDir, writeFrames, writeTake } from './files.js';
import { installRedaction, watchText, type Hit } from './guard.js';
import { watchScenery } from './scenery.js';
import { startScreencast, type Frame } from './screencast.js';
import { serveFolder, type Served } from './serve.js';
import { renderSprites } from './sprites.js';
import { playSteps, type Caption, type Stage } from './steps.js';
import { seeded } from './motion.js';

const TITLE_MS = 2000;
const END_HOLD_MS = 800;

async function openPage(browser: Browser, loaded: LoadedScript, start: string): Promise<Page> {
  const { script } = loaded;
  const context = await browser.newContext({ viewport: script.viewport, deviceScaleFactor: script.scale, colorScheme: script.colorScheme });
  await installRedaction(context, script.redact);
  await installExclusion(context, script.exclude);
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    log.warn(`page error: ${error.message}`);
  });
  await page.goto(start, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  return page;
}

/** Holds the last frame long enough for the payoff and for every caption to finish. */
function endHold(captions: readonly Caption[]): number {
  const t = now();
  const captionEnd = Math.max(0, ...captions.map((c) => c.t + c.ms / 1000 - t));
  return Math.max(END_HOLD_MS, Math.ceil(captionEnd * 1000));
}

async function sprites(browser: Browser, preset: Preset, dir: string, captions: readonly Caption[], title: string | undefined): Promise<Pick<Take, 'captions' | 'title'>> {
  const items = captions.map((c, i) => ({ text: c.text, file: path.join(dir, 'sprites', `caption-${String(i)}.png`) }));
  if (title !== undefined) items.push({ text: title, file: path.join(dir, 'sprites', 'title.png') });
  await renderSprites(browser, preset, items);
  const out = captions.map((c, i) => ({ t: c.t, ms: c.ms, sprite: `caption-${String(i)}.png` }));
  return title === undefined ? { captions: out } : { captions: out, title: { sprite: 'title.png', ms: TITLE_MS } };
}

async function perform(page: Page, loaded: LoadedScript, base: string, dir: string): Promise<Omit<Take, 'captions' | 'title'> & { said: Caption[] }> {
  const { script } = loaded;
  const director = new Director(page);
  const actor = new Actor(page, seeded(script.seed), [script.viewport.width * 0.72, script.viewport.height * 0.8]);
  const stage: Stage = { page, actor, director, captions: [], resolveUrl: urlResolver(base) };
  const cdp = await page.context().newCDPSession(page);
  if (script.setup.length > 0) {
    log.info(`setup: ${String(script.setup.length)} steps before filming`);
    await playSteps(stage, script.setup);
  }
  const guard = watchText(page, script.forbid);
  const scenery = watchScenery(page);
  const stop = await startScreencast(cdp, { width: script.viewport.width * script.scale, height: script.viewport.height * script.scale });
  await director.shot('start', 'window', 'the whole page');
  let hits: Hit[];
  let seen: Take['scenery'];
  let frames: Frame[];
  try {
    await playSteps(stage, script.steps);
    await actor.wait(endHold(stage.captions));
  } finally {
    await director.stop();
    hits = await guard.stop();
    seen = await scenery.stop();
    frames = closeFrames(await stop(), now());
  }
  await writeFrames(dir, frames);
  const seconds = (frames.at(-1)?.t ?? 0) - (frames[0]?.t ?? 0);
  log.info(`recorded ${String(frames.length)} frames, ${seconds.toFixed(1)} s`);
  const vp = script.viewport;
  return { version: 1, viewport: vp, scale: script.scale, times: frames.map((f) => f.t), pointer: actor.pointer, clicks: actor.clicks.filter((c) => c[0] >= (frames[0]?.t ?? 0)), shots: director.shots, subjects: director.subjects, hits, scenery: seen, said: stage.captions };
}

/** Records `loaded` into `dir` and returns the take it wrote. */
export async function record(loaded: LoadedScript, preset: Preset, dir: string): Promise<Take> {
  await freshDir(dir);
  let served: Served | undefined;
  const browser = await launchBrowser(loaded.script.scale);
  try {
    if (loaded.serveDir !== undefined) served = await serveFolder(loaded.serveDir);
    const start = served === undefined ? (loaded.script.url ?? '') : new URL(loaded.script.url ?? '/', served.origin).toString();
    log.info(`recording ${start}`);
    const page = await openPage(browser, loaded, start);
    const { said, ...rest } = await perform(page, loaded, start, dir);
    const take: Take = { ...rest, ...(await sprites(browser, preset, dir, said, loaded.script.title)) };
    await writeTake(dir, take);
    return take;
  } finally {
    await browser.close();
    await served?.close();
  }
}
