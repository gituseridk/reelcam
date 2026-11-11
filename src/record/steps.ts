/** Plays a script's steps on the page: the actor for the hand, the director for the camera. */
import type { Page } from 'playwright';
import { UserError, describe } from '../errors.js';
import { log } from '../log.js';
import type { Step } from '../script/steps.js';
import { now } from '../take.js';
import type { Actor } from './actor.js';
import type { Director } from './director.js';
import { resolvePoint } from './points.js';

export interface Caption {
  t: number;
  ms: number;
  text: string;
}

export interface Stage {
  page: Page;
  actor: Actor;
  director: Director;
  captions: Caption[];
  /** Turns a script URL (absolute or a path) into the URL to open. */
  resolveUrl: (url: string) => string;
}

const VISIBLE = 10_000;

/** Steps that only direct the camera or queue an overlay: nothing happens on the page. */
const CAMERA_ONLY: ReadonlySet<Step['kind']> = new Set(['focus', 'wide', 'caption']);

async function visible(stage: Stage, selector: string): Promise<ReturnType<Page['locator']>> {
  const target = stage.page.locator(selector).first();
  await target.waitFor({ state: 'visible', timeout: VISIBLE });
  return target;
}

async function scroll(stage: Stage, by: number, to: string | undefined, ms: number): Promise<void> {
  let dy = by;
  if (to !== undefined) {
    const box = await (await visible(stage, to)).boundingBox();
    const vp = stage.page.viewportSize();
    if (box === null || vp === null) throw new UserError(`scroll: "${to}" has no box`);
    dy = box.y + box.height / 2 - vp.height / 2;
  }
  await stage.actor.scroll(dy, ms);
}

async function play(stage: Stage, step: Step, label: string): Promise<void> {
  const { actor, director, page } = stage;
  switch (step.kind) {
    case 'visit':
      await page.goto(stage.resolveUrl(step.url), { waitUntil: 'load' });
      return;
    case 'click':
      if (typeof step.at === 'string') return actor.click(await visible(stage, step.at));
      return actor.clickAt(await resolvePoint(page, step.at, step.on));
    case 'drag':
      return actor.drag(await resolvePoint(page, step.from, step.on), await resolvePoint(page, step.to, step.on), step.ms);
    case 'hover':
      if (typeof step.at === 'string') return actor.moveTo(await visible(stage, step.at));
      return actor.hoverAt(await resolvePoint(page, step.at, step.on));
    case 'type':
      if (step.into !== undefined) await actor.click(await visible(stage, step.into));
      return actor.type(step.text, step.delay);
    case 'press':
      return actor.press(step.key);
    case 'scroll':
      return scroll(stage, step.by, step.to, step.ms);
    case 'wait':
      return actor.wait(step.ms);
    case 'waitFor':
      await visible(stage, step.on);
      return;
    case 'focus':
      if (typeof step.on !== 'string') return director.shot(`${label} area`, step.on, step.why, step.zoom);
      return director.shot(`${label} ${step.on}`, await visible(stage, step.on), step.why, step.zoom);
    case 'wide':
      return director.shot(label, 'window', step.why);
    case 'caption':
      stage.captions.push({ t: now(), ms: step.ms, text: step.text });
      return;
  }
}

/** Runs every step in order; a failing step stops the take with its index and kind in the message. */
export async function playSteps(stage: Stage, steps: readonly Step[]): Promise<void> {
  const start = now();
  for (const [i, step] of steps.entries()) {
    const label = `steps[${String(i)}] ${step.kind}`;
    log.debug(`${label} at ${(now() - start).toFixed(2)} s`);
    try {
      await play(stage, step, label);
      if (!CAMERA_ONLY.has(step.kind)) stage.director.seen();
    } catch (error) {
      if (error instanceof UserError) throw new UserError(`${label}: ${error.message}`, error.hint, { cause: error });
      throw new UserError(`${label} failed: ${describe(error)}`, 'Check the selector in the browser devtools, or add a "waitFor" step before it.', { cause: error });
    }
  }
}
