/** Framing: a shot names a SUBJECT (a DOM box); the camera frames the whole subject with air on
 *  every side, never the cursor. While a shot lasts the frame only grows, so a growing subject is
 *  never cropped. */
import type { Rect, Shot, Take } from '../take.js';
import type { Layout } from './geometry.js';

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/** Index of the last entry whose time is <= t, or -1. */
export function lastAtOrBefore(times: readonly number[], t: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? Infinity) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

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

  constructor(
    take: Pick<Take, 'shots' | 'subjects'>,
    private readonly lay: Layout,
    readonly bands: readonly Band[] = [],
  ) {
    this.shots = take.shots;
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

  /** The wanted camera (cx, cy, zoom) on the canvas at time t. */
  target(t: number): [number, number, number] {
    const { preset } = this.lay;
    const rest: [number, number, number] = [preset.width / 2, preset.height / 2, 1];
    const i = Math.max(0, this.index(t)); // before the first cut, the first shot already holds
    const shot = this.shots[i];
    const acc = this.grown[i];
    if (shot === undefined || acc === undefined || shot.window) return rest;
    const r = acc[Math.max(0, lastAtOrBefore(acc.map((a) => a[0]), t))]?.[1] ?? shot.rect;
    const s = this.lay.s;
    const reserve = this.reserve(i);
    const fit = Math.min((preset.fill * preset.width) / Math.max(1, r.width * s), (preset.fill * (preset.height - reserve)) / Math.max(1, r.height * s));
    const z = Math.min(fit, shot.zoom ?? preset.maxZoom);
    if (z < preset.minGain) return rest;
    const [cx, cy] = this.lay.toCanvas(r.x + r.width / 2, r.y + r.height / 2);
    return [cx, cy + reserve / (2 * z), z];
  }
}
