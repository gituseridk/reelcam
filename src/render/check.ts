/** The automatic framing check. A video FAILS when, after the camera settled on a shot, its subject
 *  is not entirely in frame; when a shot is held too briefly to read; or when a click happens
 *  outside the frame. */
import type { Rect } from '../take.js';
import { lastAtOrBefore, type Framing } from './framing.js';
import type { Layout, View } from './geometry.js';

export const SETTLE = 0.15; // seconds after a cut before the subject must be whole (the camera moves ahead of the cut)
export const GRACE = 0.6; // seconds after the subject itself changed size
export const MIN_HOLD = 1.2; // a shot shorter than this is a flicker, not a shot

export interface ViewAt extends View {
  t: number;
}

function moved(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) > 3 || Math.abs(a.y - b.y) > 3 || Math.abs(a.width - b.width) > 3 || Math.abs(a.height - b.height) > 3;
}

/** The subject box in force at t during shot i, and when it last changed. */
export function subjectAt(framing: Framing, i: number, t: number): { rect: Rect; changed: number } | null {
  const list = framing.samples[i];
  if (list === undefined || list.length === 0) return null;
  const k = Math.max(0, lastAtOrBefore(list.map((s) => s[0]), t));
  let changed = list[0]?.[0] ?? t;
  for (let j = 1; j <= k; j++) {
    const a = list[j - 1];
    const b = list[j];
    if (a !== undefined && b !== undefined && moved(a[1], b[1])) changed = b[0];
  }
  const rect = list[k]?.[1];
  return rect === undefined ? null : { rect, changed };
}

function inside(v: View, x0: number, y0: number, x1: number, y1: number): boolean {
  return x0 >= v.x - 0.5 && y0 >= v.y - 0.5 && x1 <= v.x + v.width + 0.5 && y1 <= v.y + v.height + 0.5;
}

function holds(framing: Framing, end: number): string[] {
  return framing.shots.flatMap((s, n) => {
    const until = framing.starts[n + 1] ?? end;
    return until - s.t < MIN_HOLD ? [`shot "${s.name}" is held only ${(until - s.t).toFixed(2)} s (minimum ${String(MIN_HOLD)} s)`] : [];
  });
}

/** True while the camera is already leaving shot i for the next one (it moves `lead` s ahead). */
function leaving(framing: Framing, lay: Layout, i: number, t: number): boolean {
  const next = framing.starts[i + 1];
  return next !== undefined && t > next - lay.preset.lead;
}

function crops(framing: Framing, lay: Layout, views: readonly ViewAt[], t0: number): string[] {
  for (const v of views) {
    const i = framing.index(v.t);
    const shot = framing.shots[i];
    if (shot === undefined || shot.window || v.t < shot.t + SETTLE || leaving(framing, lay, i, v.t)) continue;
    const at = subjectAt(framing, i, v.t);
    if (at === null || v.t < at.changed + GRACE) continue;
    const [x0, y0] = lay.toCanvas(at.rect.x, at.rect.y);
    const [x1, y1] = lay.toCanvas(at.rect.x + at.rect.width, at.rect.y + at.rect.height);
    if (!inside(v, x0, y0, x1, y1)) return [`t=${(v.t - t0).toFixed(2)} s, shot "${shot.name}": the subject is cropped`];
  }
  return [];
}

/** A settled frame where a text overlay covers part of the shot's subject. */
function covered(framing: Framing, lay: Layout, views: readonly ViewAt[], t0: number): string[] {
  const H = lay.preset.height;
  for (const v of views) {
    const i = framing.index(v.t);
    const shot = framing.shots[i];
    const band = framing.bands.find((b) => v.t >= b.start + 0.3 && v.t <= b.end - 0.4);
    if (shot === undefined || shot.window || band === undefined || v.t < shot.t + SETTLE || leaving(framing, lay, i, v.t)) continue;
    const at = subjectAt(framing, i, v.t);
    if (at === null || v.t < at.changed + GRACE) continue;
    const bottom = (lay.toCanvas(0, at.rect.y + at.rect.height)[1] - v.y) * (H / v.height);
    if (bottom > H - band.height + 1) return [`t=${(v.t - t0).toFixed(2)} s, shot "${shot.name}": a caption covers the subject`];
  }
  return [];
}

function clicksOutside(lay: Layout, views: readonly ViewAt[], clicks: readonly [number, number, number][], t0: number): string[] {
  const times = views.map((v) => v.t);
  return clicks.flatMap(([t, x, y]) => {
    const v = views[Math.min(views.length - 1, Math.max(0, lastAtOrBefore(times, t)))];
    const [px, py] = lay.toCanvas(x, y);
    return v === undefined || inside(v, px, py, px, py) ? [] : [`t=${(t - t0).toFixed(2)} s: a click happens outside the camera frame`];
  });
}

/** Every problem found; an empty list means the video passes. */
export function checkFraming(framing: Framing, lay: Layout, views: readonly ViewAt[], clicks: readonly [number, number, number][], span: [number, number]): string[] {
  return [...holds(framing, span[1]), ...crops(framing, lay, views, span[0]), ...covered(framing, lay, views, span[0]), ...clicksOutside(lay, views, clicks, span[0])];
}
