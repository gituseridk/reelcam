/** The caption check: a video FAILS when a caption or the title pill, on any frame where it can be
 *  seen (its fades included), lies over what the shot frames: the subject of a focused shot, or
 *  any piece of the page (a text run, a card, a control) in a wide shot. */
import { GRACE, SETTLE, leaving, subjectAt, type ViewAt } from './check.js';
import { canvasRect, pieces } from './composer.js';
import type { Band, Framing } from './framing.js';
import type { Layout, View } from './geometry.js';
import { fade } from './overlays.js';

/** An overlay counts as covering from this opacity on. */
export const SEEN = 0.1;

/** The band on screen: centred, from its top to the bottom of the frame. */
export function bandRect(lay: Layout, b: Band): View {
  const { width: W, height: H } = lay.preset;
  const w = b.width ?? W;
  return { x: (W - w) / 2, y: H - b.height, width: w, height: b.height };
}

/** A canvas rect as it shows on screen through the view v. */
export function onScreen(lay: Layout, v: View, r: View): View {
  const k = lay.preset.width / v.width;
  return { x: (r.x - v.x) * k, y: (r.y - v.y) * k, width: r.width * k, height: r.height * k };
}

const overlaps = (a: View, b: View): boolean =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;

/** What shot i frames at t, on the canvas: its subject, or every piece of the page for a wide
 *  shot. Null while a focused subject has just changed size (the camera is still following). */
function framed(framing: Framing, lay: Layout, i: number, t: number): { what: string; boxes: View[] } | null {
  const shot = framing.shots[i];
  if (shot === undefined) return null;
  if (shot.window) return { what: 'a piece of the page', boxes: pieces(lay, framing.scene(t)[1], null) };
  const at = subjectAt(framing, i, t);
  return at === null || t < at.changed + GRACE ? null : { what: 'the subject', boxes: [canvasRect(lay, at.rect)] };
}

/** The first frame per overlay where it covers what the shot frames. */
export function covered(framing: Framing, lay: Layout, views: readonly ViewAt[], t0: number): string[] {
  const problems: string[] = [];
  for (const b of framing.bands) {
    const band = bandRect(lay, b);
    for (const v of views) {
      const i = framing.index(v.t);
      const shot = framing.shots[i];
      if (shot === undefined || fade(v.t - b.start, b.end - b.start) < SEEN || v.t < shot.t + SETTLE || leaving(framing, lay, i, v.t)) continue;
      const f = framed(framing, lay, i, v.t);
      if (!f?.boxes.some((box) => overlaps(onScreen(lay, v, box), band))) continue;
      problems.push(`t=${(v.t - t0).toFixed(2)} s, shot "${shot.name}": a caption covers ${f.what}`);
      break;
    }
  }
  return problems;
}
