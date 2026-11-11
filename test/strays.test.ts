import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { canvasRect, countCuts, inside } from '../src/render/composer.js';
import { Framing } from '../src/render/framing.js';
import { Layout, cameraView } from '../src/render/geometry.js';
import { isStray } from '../src/render/stray-geometry.js';
import { strayInFrame } from '../src/render/strays.js';
import type { Item } from '../src/take.js';
import { rect, shot, take } from './helpers.js';

const frame = rect(0, 0, 1000, 600);
const subject = rect(400, 250, 400, 120);
const orphan = rect(30, 270, 80, 30);
const lay = new Layout({ ...getPreset('bare'), width: 1000, height: 600, breathe: 0 }, frame);
const item = (label: string, box = orphan, domPath?: number[]): Item => ({ kind: 'box', label, rect: box, ...(domPath === undefined ? {} : { domPath }) });

describe('stray geometry', () => {
  it('finds the whole New chat button alone in the left margin', () => {
    expect(isStray(orphan, subject, frame, frame, [orphan])).toBe(true);
  });

  it('recognizes all four edges at different scales', () => {
    const around = [orphan, rect(930, 270, 40, 30), rect(500, 20, 80, 24), rect(500, 550, 80, 24)];
    for (const p of around) {
      expect(isStray(p, subject, frame, frame, [p])).toBe(true);
      const scale = (r: typeof frame): typeof frame => rect(r.x * 2, r.y * 2, r.width * 2, r.height * 2);
      expect(isStray(scale(p), scale(subject), scale(frame), scale(frame), [scale(p)])).toBe(true);
    }
  });

  it('keeps a legitimate toolbar right next to the subject', () => {
    const toolbar = rect(350, 270, 30, 30);
    expect(isStray(toolbar, subject, frame, frame, [toolbar])).toBe(false);
  });

  it('ignores contained elements, containers, large panels and pieces away from an edge', () => {
    for (const p of [subject, rect(450, 270, 80, 30), frame, rect(10, 100, 300, 200), rect(160, 270, 80, 30)]) {
      expect(isStray(p, subject, frame, frame, [p])).toBe(false);
    }
  });

  it('leaves partial elements to the neighbour check, including page-edge clipping', () => {
    expect(isStray(rect(-10, 270, 80, 30), subject, frame, frame, [])).toBe(false);
    expect(isStray(orphan, subject, frame, rect(50, 0, 950, 600), [])).toBe(false);
  });

  it('requires a mostly empty gap, counting duplicate scenery only once', () => {
    const bridge = rect(150, 270, 220, 30);
    expect(isStray(orphan, subject, frame, frame, [orphan, bridge])).toBe(false);
    const small = rect(200, 270, 20, 30);
    expect(isStray(orphan, subject, frame, frame, [orphan, small, { ...small }, { ...small }])).toBe(true);
  });
});

describe('stray check', () => {
  const newChat = item('New chat');
  const f = new Framing(take([shot(10, subject)], { scenery: [[10, [newChat]]] }), lay);

  it('names the stray and remedies, once per shot, relative to the take start', () => {
    const problems = strayInFrame(f, lay, [{ t: 10, ...frame }, { t: 11, ...frame }], 10);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/t=0.00 s, shot "shot@10": stray in frame: box "New chat"/);
    expect(problems[0]).toMatch(/tighter zoom level or exclude:/);
  });

  it('does not flag wide shots or frames before a cut or while leaving it', () => {
    const wide = new Framing(take([shot(0, frame, { window: true })], { scenery: [[0, [newChat]]] }), lay);
    expect(strayInFrame(wide, lay, [{ t: 1, ...frame }], 0)).toEqual([]);
    const cuts = new Framing(take([shot(10, subject), shot(12, subject)], { scenery: [[10, [newChat]]] }), lay);
    expect(strayInFrame(cuts, lay, [{ t: 9, ...frame }, { t: 11.5, ...frame }], 0)).toEqual([]);
  });

  it('excludes the subject, ancestors and overflowing descendants using DOM ancestry', () => {
    for (const domPath of [[1, 2], [1, 2, 3], [1, 2, 3, 4]]) {
      const related = item('subject family', orphan, domPath);
      const family = new Framing(take([shot(0, subject, { domPath: [1, 2, 3] })], { scenery: [[0, [related]]] }), lay);
      expect(strayInFrame(family, lay, [{ t: 1, ...frame }], 0)).toEqual([]);
    }
    const sibling = new Framing(take([shot(0, subject, { domPath: [1, 2, 3] })], { scenery: [[0, [item('sibling', orphan, [1, 2, 4])]]] }), lay);
    expect(strayInFrame(sibling, lay, [{ t: 1, ...frame }], 0)).toHaveLength(1);
  });

  it('uses the current scenery and reports each shot separately', () => {
    const changing = new Framing(take([shot(0, subject), shot(3, subject)], { scenery: [[0, []], [1, [newChat]]] }), lay);
    expect(strayInFrame(changing, lay, [{ t: 0, ...frame }], 0)).toEqual([]);
    expect(strayInFrame(changing, lay, [{ t: 1, ...frame }, { t: 3, ...frame }], 0)).toHaveLength(2);
  });

  it('counts overflowing descendants as occupied scenery while ignoring ancestor backgrounds', () => {
    const background = item('subject background', frame, [1, 2]);
    const child = item('overflowing toolbar', rect(150, 270, 220, 30), [1, 2, 3, 4]);
    const sibling = item('New chat', orphan, [1, 5]);
    const make = (items: Item[]): Framing => new Framing(take([shot(0, subject, { domPath: [1, 2, 3] })], { scenery: [[0, items]] }), lay);
    expect(strayInFrame(make([background, sibling]), lay, [{ t: 1, ...frame }], 0)).toHaveLength(1);
    expect(strayInFrame(make([background, sibling, child]), lay, [{ t: 1, ...frame }], 0)).toEqual([]);
  });
});

describe('automatic stray framing', () => {
  it('nudges the chat zoom to avoid the orphan while preserving the subject and zoom cap', () => {
    const card = rect(400, 300, 300, 120);
    const button = item('New chat', rect(260, 190, 70, 24));
    const scene = [canvasRect(lay, button.rect)];
    const ideal = cameraView(550, 360, 1.6, 1000, 600);
    expect(isStray(scene[0] ?? frame, card, ideal, lay.page, scene)).toBe(true);
    const framed = new Framing(take([shot(0, card, { zoom: 1.6 })], { scenery: [[0, [button]]] }), lay);
    const target = framed.target(1);
    const view = cameraView(...target, 1000, 600);
    expect(target[2]).toBeLessThanOrEqual(1.6);
    expect(inside(card, view, 0)).toBe(true);
    expect(countCuts(scene, view, lay.page, 0)).toBe(0);
    expect(strayInFrame(framed, lay, [{ t: 1, ...view }], 0)).toEqual([]);
  });

  it('keeps the subject above a caption while the corrected frame breathes', () => {
    const breathing = new Layout({ ...lay.preset, breathe: 0.03 }, frame);
    const card = rect(400, 300, 300, 120);
    const button = item('New chat', rect(260, 190, 70, 24));
    const framed = new Framing(take([shot(0, card, { zoom: 1.6 })], { scenery: [[0, [button]]] }), breathing, [{ start: 0, end: 6, height: 80 }]);
    const views = Array.from({ length: 11 }, (_, i) => {
      const target = framed.target(i / 2);
      const view = cameraView(...target, 1000, 600, framed.reserve(0));
      expect(inside(card, view, 0)).toBe(true);
      expect(card.y + card.height).toBeLessThanOrEqual(view.y + view.height - 80 / target[2]);
      expect(countCuts([button.rect], view, breathing.page, 0)).toBe(0);
      return { t: i / 2, ...view };
    });
    expect(strayInFrame(framed, breathing, views, 0)).toEqual([]);
  });
});
