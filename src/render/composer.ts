/** Composition: avoids cut neighbours and isolated strays around a focus shot. Around the ideal
 *  frame (subject centred, 88% fill) it tries nearby zooms and positions, keeping the subject whole.
 *  Cuts and stage slivers cost more than strays; strays cost more than distance from the ideal. */
import type { Item, Rect } from '../take.js';
import { cameraView, type Layout, type View } from './geometry.js';
import { countStrays, relatedPaths } from './stray-geometry.js';

/** Canvas px every piece keeps from the frame edge (also soaks up the spring's last few px). */
export const CLEAR = 10;

export interface Choice {
  cx: number;
  cy: number;
  z: number;
  /** The slow push-in is allowed only when it cuts nothing new. */
  breathe: boolean;
  cuts: number;
  /** How far this frame is from the ideal, including cuts, stage showing and isolated strays. */
  cost: number;
}

export function canvasRect(lay: Layout, r: Rect): View {
  const [x, y] = lay.toCanvas(r.x, r.y);
  return { x, y, width: r.width * lay.s, height: r.height * lay.s };
}

export const inside = (a: View, b: View, pad: number): boolean =>
  a.x >= b.x + pad - 0.5 && a.y >= b.y + pad - 0.5 && a.x + a.width <= b.x + b.width - pad + 0.5 && a.y + a.height <= b.y + b.height - pad + 0.5;

const overlaps = (a: View, b: View): boolean =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0.5;

const grow = (v: View, pad: number): View => ({ x: v.x - pad, y: v.y - pad, width: v.width + 2 * pad, height: v.height + 2 * pad });

/** True when the piece shows only in part: some of it in the frame (on the page), not all of it.
 *  With a pad, a piece must also keep that distance from the edge, inside or out. */
export function isCut(piece: View, frame: View, page: View, pad: number): boolean {
  if (!overlaps(piece, grow(frame, pad)) || !overlaps(piece, page)) return false;
  return !(inside(piece, frame, pad) && inside(piece, page, 0));
}

/** The pieces that matter for a subject: all but the subject's own containers. */
export function pieces(lay: Layout, items: readonly Item[], subject: View | null): View[] {
  const all = items.map((it) => canvasRect(lay, it.rect));
  return subject === null ? all : all.filter((p) => !inside(subject, p, -1));
}

/** Relatives cannot be strays, but overflowing children still occupy the gap to other controls.
 *  Ancestor backgrounds do not fill otherwise empty space around the subject. */
export function strayScene(lay: Layout, items: readonly Item[], domPath?: readonly number[]): { candidates: { item: Item; box: View }[]; scenery: View[] } {
  const all = items.map((item) => ({ item, box: canvasRect(lay, item.rect) }));
  const candidates = all.filter(({ item }) => !relatedPaths(item.domPath, domPath));
  const scenery = all.filter(({ item }) => !relatedPaths(item.domPath, domPath) || (item.domPath?.length ?? 0) > (domPath?.length ?? 0)).map((p) => p.box);
  return { candidates, scenery };
}

export function countCuts(list: readonly View[], frame: View, page: View, pad: number): number {
  let n = 0;
  for (const p of list) if (isCut(p, frame, page, pad)) n += 1;
  return n;
}

interface Want {
  subject: View;
  z0: number;
  c0: [number, number];
  zMin: number;
  zMax: number;
  reserve: number;
}

/** The share of the frame that shows the stage instead of the page (0 when the page fills it). */
function offPage(frame: View, page: View): number {
  const w = Math.max(0, Math.min(frame.x + frame.width, page.x + page.width) - Math.max(frame.x, page.x));
  const h = Math.max(0, Math.min(frame.y + frame.height, page.y + page.height) - Math.max(frame.y, page.y));
  return 1 - (w * h) / (frame.width * frame.height);
}

/** A thin strip of stage (under 40 screen px) showing past a page edge reads as a glitch. */
export function stageSliver(v: View, page: View, screenW: number): string | null {
  const k = screenW / v.width;
  const gaps: [string, number][] = [
    ['left', page.x - v.x],
    ['right', v.x + v.width - (page.x + page.width)],
    ['top', page.y - v.y],
    ['bottom', v.y + v.height - (page.y + page.height)],
  ];
  const thin = gaps.find(([, g]) => g * k > 0.75 && g * k < 40);
  return thin === undefined ? null : `a thin strip of stage shows at the ${thin[0]} edge`;
}

/** Centre positions to try along one axis: the subject stays inside with 1.5% air. */
function positions(lo: number, hi: number, ideal: number): number[] {
  if (hi < lo) return [];
  const out = [Math.min(Math.max(ideal, lo), hi)];
  for (let k = 0; k <= 8; k++) out.push(lo + ((hi - lo) * k) / 8);
  return out;
}

function tryZoom(lay: Layout, want: Want, list: readonly View[], strays: readonly View[], scenery: readonly View[], z: number, best: Choice | null): Choice | null {
  const { width: W, height: H } = lay.preset;
  const s = want.subject;
  const [w, h] = [W / z, H / z];
  const [ax, ay] = [0.015 * w, 0.015 * h];
  const p = lay.page;
  // Also try the positions that put a frame edge exactly on a page edge: no strip of stage.
  const xs = [...positions(s.x + s.width + ax - w / 2, s.x - ax + w / 2, want.c0[0]), p.x + w / 2, p.x + p.width - w / 2];
  const ys = [...positions(s.y + s.height + ay + want.reserve / z - h / 2, s.y - ay + h / 2, want.c0[1]), p.y + h / 2, p.y + p.height - h / 2];
  let out = best;
  for (const cx of xs) {
    for (const cy of ys) {
      const frame = cameraView(cx, cy, z, W, H, want.reserve);
      if (!inside(s, frame, 0) || s.y + s.height > frame.y + frame.height - want.reserve / z) continue;
      const cuts = countCuts(list, frame, lay.page, CLEAR);
      const strayCost = Math.min(4, countStrays(strays, s, frame, lay.page, scenery)) * 100;
      const fill = Math.max(s.width / frame.width, s.height / frame.height);
      const cramped = Math.max(0, fill - 0.93) * 100; // a subject filling the frame edge to edge feels cramped
      const sliver = stageSliver(frame, lay.page, W) === null ? 0 : 500;
      const cost = cuts * 1000 + sliver + strayCost + cramped + offPage(frame, lay.page) * 60 + Math.abs(Math.log(z / want.z0)) * 3 + Math.abs(cx - want.c0[0]) / W + Math.abs(cy - want.c0[1]) / H;
      if (cost < (out?.cost ?? Infinity)) out = { cx, cy, z, cuts, breathe: false, cost };
    }
  }
  return out;
}

/** Slides a frame that shows a thin strip of stage past a page edge back onto the page, when that
 *  keeps the subject whole and cuts nothing new (a 2 px strip of stage reads as a glitch). */
function snap(lay: Layout, want: Want, list: readonly View[], strays: readonly View[], scenery: readonly View[], c: Choice): Choice {
  const { width: W, height: H } = lay.preset;
  const v = cameraView(c.cx, c.cy, c.z, W, H, want.reserve);
  const p = lay.page;
  const dy = v.y + v.height > p.y + p.height ? p.y + p.height - (v.y + v.height) : v.y < p.y ? p.y - v.y : 0;
  const dx = v.x + v.width > p.x + p.width ? p.x + p.width - (v.x + v.width) : v.x < p.x ? p.x - v.x : 0;
  if ((dx === 0 && dy === 0) || Math.abs(dy) > v.height * 0.06 || Math.abs(dx) > v.width * 0.06) return c;
  const moved = { ...c, cx: c.cx + dx, cy: c.cy + dy };
  const frame = cameraView(moved.cx, moved.cy, c.z, W, H, want.reserve);
  const ok = inside(want.subject, frame, 0) && want.subject.y + want.subject.height <= frame.y + frame.height - want.reserve / c.z &&
    countCuts(list, frame, p, CLEAR) <= c.cuts && countStrays(strays, want.subject, frame, p, scenery) <= countStrays(strays, want.subject, v, p, scenery);
  return ok ? moved : c;
}

/** The best frame for `want` among nearby zooms and positions. */
export function compose(lay: Layout, want: Want, list: readonly View[], strays: readonly View[] = list, scenery: readonly View[] = list): Choice {
  let best: Choice | null = null;
  for (let k = -14; k <= 8; k++) {
    const z = want.z0 * (1 + 0.035 * k);
    if (z < want.zMin || z > want.zMax) continue;
    best = tryZoom(lay, want, list, strays, scenery, z, best);
  }
  const chosen = snap(lay, want, list, strays, scenery, best ?? { cx: want.c0[0], cy: want.c0[1], z: want.z0, cuts: 0, breathe: false, cost: 0 });
  const still = cameraView(chosen.cx, chosen.cy, chosen.z, lay.preset.width, lay.preset.height, want.reserve);
  const pushed = cameraView(chosen.cx, chosen.cy, chosen.z * (1 + lay.preset.breathe), lay.preset.width, lay.preset.height, want.reserve);
  const breathe = countCuts(list, pushed, lay.page, CLEAR) <= chosen.cuts && inside(want.subject, pushed, 0) &&
    want.subject.y + want.subject.height <= pushed.y + pushed.height - want.reserve / (chosen.z * (1 + lay.preset.breathe)) &&
    countStrays(strays, want.subject, pushed, lay.page, scenery) <= countStrays(strays, want.subject, still, lay.page, scenery);
  return { ...chosen, breathe };
}

export type { Want };
