/** The neighbour check: once the camera has landed on a shot, no other piece of the page (a text
 *  run, a card, a control) may show only in part, cut by the frame edge or by the page edge. */
import type { Item } from '../take.js';
import { SETTLE, leaving, type ViewAt } from './check.js';
import { canvasRect, inside, isCut, stageSliver } from './composer.js';
import type { Framing } from './framing.js';
import type { Layout, View } from './geometry.js';

/** Which edge cuts the piece: the frame's left, right, top or bottom, or the page's. */
export function edgeOf(piece: View, frame: View, page: View): string {
  if (piece.x < Math.max(frame.x, page.x) - 0.5) return piece.x < page.x - 0.5 && page.x >= frame.x ? 'left edge of the page' : 'left edge';
  if (piece.x + piece.width > Math.min(frame.x + frame.width, page.x + page.width) + 0.5) return 'right edge';
  if (piece.y < Math.max(frame.y, page.y) - 0.5) return 'top edge';
  return 'bottom edge';
}

function firstCut(framing: Framing, lay: Layout, v: ViewAt, items: readonly Item[]): string | null {
  const r = framing.subject(v.t);
  const subject = r === null ? null : canvasRect(lay, r);
  for (const item of items) {
    const piece = canvasRect(lay, item.rect);
    if (subject !== null && inside(subject, piece, -1)) continue; // the subject's own container
    if (isCut(piece, v, lay.page, 0)) return `${item.kind} "${item.label}" is cut at the ${edgeOf(piece, v, lay.page)}`;
  }
  return null;
}

/** One problem per shot at most: the first settled frame where a neighbour is cut. */
export function neighbourCuts(framing: Framing, lay: Layout, views: readonly ViewAt[], t0: number): string[] {
  const problems: string[] = [];
  const reported = new Set<number>();
  for (const v of views) {
    const i = framing.index(v.t);
    const shot = framing.shots[i];
    if (shot === undefined || reported.has(i) || v.t < shot.t + SETTLE || leaving(framing, lay, i, v.t)) continue;
    const cut = firstCut(framing, lay, v, framing.scene(v.t)[1]) ?? (shot.window ? null : stageSliver(v, lay.page, lay.preset.width));
    if (cut === null) continue;
    problems.push(`t=${(v.t - t0).toFixed(2)} s, shot "${shot.name}": ${cut}`);
    reported.add(i);
  }
  return problems;
}
