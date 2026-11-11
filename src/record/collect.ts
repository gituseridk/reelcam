/** The in-page half of the scenery: walks the DOM once and lists every piece a viewer can see
 *  (text runs, cards, controls, images), each cut to what the app itself shows of it. A piece
 *  inside a scroller or an `overflow: hidden` box is clipped to that box, a fully clipped or hidden
 *  subtree is skipped whole, and a box that spans the page (a sidebar, a header bar) is page
 *  chrome, not a piece. These functions run in the browser: they may only call each other. */
import { z } from 'zod';
import { item, type Item } from '../take.js';

/** At most this many elements are visited per sample (hidden and clipped subtrees cost nothing). */
export const VISIT_BUDGET = 8000;

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** The clips in force for a child: in normal flow, absolutely positioned, fixed. */
interface Clips {
  flow: Box;
  abs: Box;
  fixed: Box;
}

export function meet(a: Box, b: Box): Box {
  return { l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) };
}

/** The box an element clips its descendants to (per axis for `overflow`), or null. */
export function ownClip(el: Element, cs: CSSStyleDeclaration): Box | null {
  const r = el.getBoundingClientRect();
  const all = cs.clipPath !== 'none' || /paint|strict|content/.test(cs.contain) || (cs.maskImage !== '' && cs.maskImage !== 'none');
  const cx = all || cs.overflowX !== 'visible';
  const cy = all || cs.overflowY !== 'visible';
  if (!cx && !cy) return null;
  return { l: cx ? r.left : -Infinity, t: cy ? r.top : -Infinity, r: cx ? r.right : Infinity, b: cy ? r.bottom : Infinity };
}

/** The clips an element hands to its children, from the ones it got. */
export function passDown(el: Element, cs: CSSStyleDeclaration, mine: Box, got: Clips): Clips {
  const own = ownClip(el, cs);
  const flow = own === null ? mine : meet(mine, own);
  const contains = cs.transform !== 'none' || cs.filter !== 'none' || /paint|strict|content|layout/.test(cs.contain);
  return { flow, abs: cs.position !== 'static' || contains ? flow : got.abs, fixed: contains ? flow : got.fixed };
}

/** One visible piece, or null: its rect is cut to the clip in force. */
export function pieceOf(el: Element, cs: CSSStyleDeclaration, clip: Box, inner: Box): Item | null {
  const vw = innerWidth;
  const vh = innerHeight;
  const text = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
  const isBox = ['IMG', 'svg', 'CANVAS', 'VIDEO', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
    cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.boxShadow !== 'none' || parseFloat(cs.borderTopWidth) > 0 || cs.backgroundImage !== 'none';
  if (cs.visibility === 'hidden' || (!text && !isBox)) return null;
  const range = document.createRange();
  range.selectNodeContents(el);
  const full = text ? range.getBoundingClientRect() : el.getBoundingClientRect();
  const c = meet({ l: full.left, t: full.top, r: full.right, b: full.bottom }, text ? inner : clip);
  const [w, h] = [c.r - c.l, c.b - c.t];
  if (w < 2 || h < 2 || c.r <= 0 || c.b <= 0 || c.l >= vw || c.t >= vh) return null;
  if (!text && (w >= vw * 0.95 || h >= vh * 0.9)) return null; // the page, a backdrop, a sidebar, a header bar
  const hit = document.elementFromPoint((Math.max(c.l, 0) + Math.min(c.r, vw)) / 2, (Math.max(c.t, 0) + Math.min(c.b, vh)) / 2);
  if (hit === null || !(el.contains(hit) || hit.contains(el))) return null; // under an overlay
  const label = text ? el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) : `${el.tagName.toLowerCase()}${el.id === '' ? '' : `#${el.id}`}`;
  return { kind: text ? 'text' : 'box', label, rect: { x: c.l, y: c.t, width: w, height: h } };
}

/** Walks the body depth first, skipping hidden and fully clipped subtrees. */
export function walk(budget: number): { items: Item[]; truncated: boolean } {
  const open: Box = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
  const stack: [Element, Clips][] = [...document.body.children].reverse().map((el) => [el, { flow: open, abs: open, fixed: open }]);
  const items: Item[] = [];
  let visited = 0;
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    if (++visited > budget) return { items, truncated: true };
    const [el, got] = next;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.contentVisibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const mine = cs.position === 'fixed' ? got.fixed : cs.position === 'absolute' ? got.abs : got.flow;
    const down = passDown(el, cs, mine, got);
    const piece = mine.r > mine.l && mine.b > mine.t ? pieceOf(el, cs, mine, down.flow) : null;
    if (piece !== null) items.push(piece);
    const empty = (b: Box): boolean => b.r <= b.l || b.b <= b.t;
    if (empty(down.flow) && empty(down.abs) && empty(down.fixed)) continue; // nothing below can show
    for (const child of [...el.children].reverse()) stack.push([child, down]);
  }
  return { items, truncated: false };
}

/** The script page.evaluate runs: the functions above, then one walk. */
export const COLLECT = `(() => {\n${[meet, ownClip, passDown, pieceOf, walk].map(String).join('\n')}\nreturn walk(${String(VISIT_BUDGET)});\n})()`;

const result = z.object({ items: z.array(item), truncated: z.boolean() });

/** Checks what the page sent back. */
export function parseCollected(raw: unknown): { items: Item[]; truncated: boolean } {
  return result.parse(raw);
}
