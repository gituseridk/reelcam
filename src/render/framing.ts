/** Framing: a shot names a SUBJECT (a DOM box); the camera frames the whole subject with air on
 *  every side, never the cursor. While a shot lasts the frame only grows, so a growing subject is
 *  never cropped. */
import type { Item, Rect, Shot, Take } from '../take.js';
import { ease } from '../record/motion.js';
import { CLEAR, canvasRect, compose, countCuts, pieces, type Choice } from './composer.js';
import { cameraView, wideZoom, type Layout } from './geometry.js';
import { SceneIndex } from './scene-index.js';
import { lastAtOrBefore } from './search.js';

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

export { lastAtOrBefore } from './search.js';

/** A text overlay's time span and the canvas height it needs at the bottom of the frame. */
export interface Band {
  start: number;
  end: number;
  height: number;
}

export class Framing {
  readonly shots: Shot[];
  readonly starts: number[];
  /** Per shot: every measured box with its time, the shot's own box first. */
  readonly samples: [number, Rect][][];
  /** Per shot: the running union of the boxes (the frame never shrinks back). */
  private readonly grown: [number, Rect][][];
  private readonly scenery: SceneIndex;
  private readonly memo = new Map<string, Choice>();

  constructor(
    readonly take: Pick<Take, 'shots' | 'subjects' | 'scenery'>,
    private readonly lay: Layout,
    readonly bands: readonly Band[] = [],
  ) {
    this.shots = take.shots;
    this.scenery = new SceneIndex(take.scenery, lay.preset.lead);
    this.starts = take.shots.map((s) => s.t);
    this.samples = take.shots.map((s): [number, Rect][] => [[s.t, s.rect]]);
    for (const [t, i, r] of take.subjects) this.samples[i]?.push([t, r]);
    this.grown = this.samples.map((list) => {
      let acc: Rect | undefined;
      return list.map(([t, r]): [number, Rect] => {
        acc = acc === undefined ? r : union(acc, r);
        return [t, acc];
      });
    });
  }

  index(t: number): number {
    return lastAtOrBefore(this.starts, t);
  }

  /** Bottom space to keep clear during shot i: the tallest overlay shown at any time in the shot,
   *  reserved for the whole shot so a caption never covers the subject and never moves the camera. */
  reserve(i: number): number {
    const start = this.starts[i] ?? -Infinity;
    const end = this.starts[i + 1] ?? Infinity;
    return Math.max(0, ...this.bands.filter((b) => b.start < end && b.end > start).map((b) => b.height));
  }

  /** The subject box of the shot in force at t (grown so far), or null for a wide shot. */
  subject(t: number): Rect | null {
    const i = Math.max(0, this.index(t));
    const shot = this.shots[i];
    const acc = this.grown[i];
    if (shot === undefined || acc === undefined || shot.window) return null;
    return acc[Math.max(0, lastAtOrBefore(acc.map((a) => a[0]), t))]?.[1] ?? shot.rect;
  }

  /** The pieces on the page at t (the latest scenery sample), with the sample's index. */
  scene(t: number): [number, readonly Item[]] {
    return this.scenery.at(t);
  }

  /** The slow push-in factor at t: 1 at the cut, up to 1 + breathe after breatheSeconds. */
  breath(t: number): number {
    const { preset } = this.lay;
    const start = this.starts[Math.max(0, this.index(t))] ?? t;
    return 1 + preset.breathe * ease(Math.min(1, Math.max(0, (t - start) / preset.breatheSeconds)));
  }

  /** For wide shots: the band of an overlay shown now (from just before it appears), so a wide shot
   *  pulls back only while a caption shows. */
  reserveNow(t: number): number {
    return Math.max(0, ...this.bands.filter((b) => t >= b.start - 0.4 && t <= b.end).map((b) => b.height));
  }

  /** A wide shot: the page fills the frame and breathes; with a caption band it pulls back just
   *  enough for the whole page to sit above the band. */
  wide(t: number, reserve: number): [number, number, number] {
    const { preset, page } = this.lay;
    const full = wideZoom(this.lay);
    const fits = (preset.height - reserve - preset.margin) / page.height;
    if (reserve === 0 || fits >= full || this.bandIsClear(t, reserve, full)) return [preset.width / 2, preset.height / 2, full * (this.wideBreathes(t) ? this.breath(t) : 1)];
    const screenY = (preset.margin + preset.height - reserve) / 2; // where the page centre should land
    const pcy = page.y + page.height / 2;
    return [preset.width / 2, pcy - (screenY - preset.height / 2) / fits, fits];
  }

  /** The wanted camera (cx, cy, zoom) on the canvas at time t. */
  target(t: number): [number, number, number] {
    const { preset } = this.lay;
    const i = Math.max(0, this.index(t)); // before the first cut, the first shot already holds
    const rest = this.wide(t, this.reserveNow(t));
    const shot = this.shots[i];
    const r = this.subject(t);
    if (shot === undefined || r === null) return rest;
    const s = this.lay.s;
    const reserve = this.reserve(i);
    const fit = Math.min((preset.fill * preset.width) / Math.max(1, r.width * s), (preset.fill * (preset.height - reserve)) / Math.max(1, r.height * s));
    const z = Math.min(fit, shot.zoom ?? preset.maxZoom);
    if (z < preset.minGain * wideZoom(this.lay)) return rest;
    const c = this.choose(i, r, z, reserve);
    return [c.cx, c.cy, c.z * (c.breathe ? this.breath(t) : 1)];
  }

  /** The composed frame for shot i at t (memoised per subject size and scenery sample). */
  private choose(i: number, r: Rect, z0: number, reserve: number): Choice {
    const key = `${String(i)}|${String(reserve)}|${JSON.stringify(r)}`;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit;
    const { preset } = this.lay;
    const subject = canvasRect(this.lay, r);
    const c0: [number, number] = [subject.x + subject.width / 2, subject.y + subject.height / 2 + reserve / (2 * z0)];
    const zMax = Math.min(this.shots[i]?.zoom ?? preset.maxZoom, z0 * 1.25);
    const want = { subject, z0, c0, zMin: preset.minGain * wideZoom(this.lay), zMax, reserve };
    const choice = compose(this.lay, want, pieces(this.lay, this.scenery.forShot(i, this.starts), subject));
    this.memo.set(key, choice);
    return choice;
  }

  /** True when nothing on the page lies under the caption band of a wide shot: no need to pull back. */
  private bandIsClear(t: number, reserve: number, z: number): boolean {
    const { width: W, height: H } = this.lay.preset;
    const view = cameraView(W / 2, H / 2, z * (1 + this.lay.preset.breathe), W, H);
    const band = { x: view.x, y: view.y + view.height - reserve / z, width: view.width, height: reserve / z };
    return pieces(this.lay, this.scene(t)[1], null).every((p) => p.y >= band.y + band.height || p.y + p.height <= band.y - CLEAR);
  }

  /** A wide shot breathes only when the push-in cuts no more pieces than the still frame. */
  private wideBreathes(t: number): boolean {
    const [k, items] = this.scene(t);
    const key = `wide|${String(k)}`;
    const hit = this.memo.get(key);
    if (hit !== undefined) return hit.breathe;
    const { width: W, height: H, breathe } = this.lay.preset;
    const full = wideZoom(this.lay);
    const list = pieces(this.lay, items, null);
    const still = countCuts(list, cameraView(W / 2, H / 2, full, W, H), this.lay.page, CLEAR);
    const pushed = countCuts(list, cameraView(W / 2, H / 2, full * (1 + breathe), W, H), this.lay.page, CLEAR);
    this.memo.set(key, { cx: 0, cy: 0, z: full, cuts: still, breathe: pushed <= still, cost: 0 });
    return pushed <= still;
  }

  /** Where the camera heads at t, seen from where it is now (cx, cy): the target of the shot that
   *  starts `lead` seconds ahead, with the zoom capped so that subject stays whole on the way. */
  aim(t: number, cx: number, cy: number): [number, number, number] {
    const ahead = t + this.lay.preset.lead;
    const [tx, ty, tz] = this.target(ahead);
    const r = this.subject(ahead);
    if (r === null) return [tx, ty, tz];
    const { width: w, height: h } = this.lay.preset;
    const [x0, y0] = this.lay.toCanvas(r.x, r.y);
    const [x1, y1] = this.lay.toCanvas(r.x + r.width, r.y + r.height);
    const dx = Math.max(Math.abs(x0 - cx), Math.abs(x1 - cx), 1);
    const dy = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy), 1);
    return [tx, ty, Math.min(tz, Math.max(1, Math.min(w / (2 * dx), h / (2 * dy))))];
  }
}
