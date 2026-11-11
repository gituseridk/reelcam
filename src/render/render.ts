/** The camera pass: turns a take into an MP4. The virtual camera cuts between the take's named
 *  shots on a damped spring; pointer, ripples and captions are drawn crisp in post. Then the
 *  framing check runs and the contact sheet is written. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { log } from '../log.js';
import type { Preset } from '../presets/index.js';
import type { Take } from '../take.js';
import { checkFraming, type ViewAt } from './check.js';
import { Compositor } from './compose.js';
import { covered } from './covered.js';
import { gifArgs, runFfmpeg, Encoder } from './encode.js';
import { Framing } from './framing.js';
import { neighbourCuts } from './neighbours.js';
import { Camera, Layout } from './geometry.js';
import { bandOf } from './overlays.js';
import { capture, planStills, writeSheet, type Still } from './sheet.js';
import { strayInFrame } from './strays.js';

export interface RenderOptions {
  output: string;
  gif: boolean;
  sheet: boolean;
  /** Fail the video when a neighbour is cut (default on; scripts can set `checks: { neighbours: false }`). */
  neighbours: boolean;
  /** Fail the video when an unrelated element sits isolated at the frame edge (default on). */
  strays: boolean;
}

export interface RenderResult {
  output: string;
  gif: string | undefined;
  sheet: string | undefined;
  seconds: number;
  problems: string[];
}

/** Seconds since the newest click at or before t, or null. */
export function clickAge(clicks: readonly [number, number, number][], t: number): number | null {
  let best: number | null = null;
  for (const [ct] of clicks) if (ct <= t && (best === null || t - ct < best)) best = t - ct;
  return best;
}

async function encodeFrames(take: Take, dir: string, preset: Preset, output: string, stills: Still[]): Promise<{ views: ViewAt[]; framing: Framing; lay: Layout }> {
  const lay = new Layout(preset, take.viewport);
  const comp = new Compositor(take, dir, lay);
  await comp.loadOverlays();
  const framing = new Framing(take, lay, comp.overlays.map((o) => bandOf(preset, o)));
  const t0 = take.times[0] ?? 0;
  const t1 = take.times.at(-1) ?? t0;
  const cam = new Camera(preset.width, preset.height, preset.halfLife);
  [cam.cx, cam.cy, cam.z] = framing.target(Math.max(t0, take.shots[0]?.t ?? t0)); // start on the first subject
  const encoder = new Encoder(preset, output);
  const dt = 1 / preset.fps;
  const views: ViewAt[] = [];
  let shot = Math.max(0, framing.index(t0 + preset.lead));
  for (let k = 0; k < Math.floor((t1 - t0) * preset.fps); k++) {
    const t = t0 + k * dt;
    const ahead = t + preset.lead;
    const next = Math.max(0, framing.index(ahead));
    if (next !== shot) cam.cut(t, preset.lead);
    shot = next;
    cam.update(framing.aim(t, cam.cx, cam.cy), t, dt, framing.subject(ahead) === null ? 0 : framing.reserve(next));
    views.push({ t, ...(await comp.draw(t, cam, clickAge(take.clicks, t))) });
    capture(stills, comp.out, t, dt);
    await encoder.write(comp.out.data());
  }
  await encoder.finish();
  return { views, framing, lay };
}

export async function renderTake(take: Take, dir: string, preset: Preset, options: RenderOptions): Promise<RenderResult> {
  const t0 = take.times[0] ?? 0;
  const t1 = take.times.at(-1) ?? t0;
  await mkdir(path.dirname(options.output), { recursive: true });
  const stills = planStills(take.shots, t0, t1);
  log.info(`rendering ${path.relative(process.cwd(), options.output) || options.output} (${preset.name}, ${String(preset.width)}x${String(preset.height)})`);
  const { views, framing, lay } = await encodeFrames(take, dir, preset, options.output, stills);
  const problems = [...checkFraming(framing, lay, views, take.clicks, [t0, t1]), ...covered(framing, lay, views, t0)];
  if (options.neighbours) problems.push(...neighbourCuts(framing, lay, views, t0));
  if (options.strays) problems.push(...strayInFrame(framing, lay, views, t0));
  for (const h of take.hits) problems.push(`t=${(h.t - t0).toFixed(2)} s: forbidden text /${h.pattern}/ on screen: "${h.text}"`);
  const base = options.output.replace(/\.mp4$/i, '');
  const sheet = options.sheet ? `${base}.sheet.png` : undefined;
  if (sheet !== undefined) await writeSheet(stills, sheet);
  const gif = options.gif ? `${base}.gif` : undefined;
  if (gif !== undefined) await runFfmpeg(gifArgs(options.output, gif, Math.min(960, preset.width)));
  return { output: options.output, gif, sheet, seconds: t1 - t0, problems };
}
