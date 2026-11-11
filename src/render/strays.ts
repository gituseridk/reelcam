/** Whole unrelated elements can distract from a focus shot even when no frame edge cuts them. */
import { SETTLE, leaving, type ViewAt } from './check.js';
import { canvasRect, strayScene } from './composer.js';
import type { Framing } from './framing.js';
import type { Layout } from './geometry.js';
import { isStray } from './stray-geometry.js';

/** One warning per focus shot, using the same geometry as automatic composition. */
export function strayInFrame(framing: Framing, lay: Layout, views: readonly ViewAt[], t0: number): string[] {
  const problems: string[] = [];
  const reported = new Set<number>();
  for (const v of views) {
    const i = framing.index(v.t);
    const shot = framing.shots[i];
    if (shot === undefined || shot.window || reported.has(i) || v.t < shot.t + SETTLE || leaving(framing, lay, i, v.t)) continue;
    const rect = framing.subject(v.t);
    if (rect === null) continue;
    const subject = canvasRect(lay, rect);
    const { candidates, scenery } = strayScene(lay, framing.scene(v.t)[1], shot.domPath);
    const stray = candidates.find((p) => isStray(p.box, subject, v, lay.page, scenery));
    if (stray === undefined) continue;
    problems.push(`t=${(v.t - t0).toFixed(2)} s, shot "${shot.name}": stray in frame: ${stray.item.kind} "${stray.item.label}" sits isolated near an edge; use a tighter zoom level or exclude: [selector]`);
    reported.add(i);
  }
  return problems;
}
