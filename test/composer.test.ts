/** Composition and the neighbour check: no other piece of the page may show only in part. */
import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { CLEAR, canvasRect, compose, isCut, pieces } from '../src/render/composer.js';
import { Framing } from '../src/render/framing.js';
import { Camera, Layout, cameraView, landing } from '../src/render/geometry.js';
import { edgeOf, neighbourCuts } from '../src/render/neighbours.js';
import type { Item } from '../src/take.js';
import { rect, shot, take } from './helpers.js';

const studio = getPreset('studio');
const lay = new Layout(studio, { width: 1280, height: 720 });
const frame = { x: 100, y: 100, width: 800, height: 450 };
const page = lay.page;

describe('isCut', () => {
  it('is false for a piece wholly in or wholly out, true for one across an edge', () => {
    expect(isCut({ x: 200, y: 200, width: 50, height: 20 }, frame, page, 0)).toBe(false);
    expect(isCut({ x: 1000, y: 200, width: 50, height: 20 }, frame, page, 0)).toBe(false);
    expect(isCut({ x: 880, y: 200, width: 50, height: 20 }, frame, page, 0)).toBe(true);
  });

  it('with a pad, a piece must keep its distance from the edge on both sides', () => {
    expect(isCut({ x: 905, y: 200, width: 50, height: 20 }, frame, page, CLEAR)).toBe(true);
    expect(isCut({ x: 875, y: 200, width: 20, height: 20 }, frame, page, CLEAR)).toBe(true);
    expect(isCut({ x: 920, y: 200, width: 20, height: 20 }, frame, page, CLEAR)).toBe(false);
  });

  it('counts a piece cut by the page edge (below the fold)', () => {
    const below = { x: 300, y: page.y + page.height - 10, width: 100, height: 40 };
    expect(isCut(below, { x: 0, y: 0, width: 1920, height: 1080 }, page, 0)).toBe(true);
  });

  it('names the edge that cuts', () => {
    expect(edgeOf({ x: 880, y: 200, width: 50, height: 20 }, frame, page)).toBe('right edge');
    expect(edgeOf({ x: 200, y: 90, width: 50, height: 20 }, frame, page)).toBe('top edge');
  });
});

const item = (label: string, x: number, y: number, width: number, height: number): Item => ({ kind: 'box', label, rect: rect(x, y, width, height) });

describe('compose', () => {
  const subject = rect(400, 300, 300, 120);
  const neighbour = item('card', 720, 300, 200, 120); // just right of the subject
  const want = (r = subject): Parameters<typeof compose>[1] => {
    const s = canvasRect(lay, r);
    return { subject: s, z0: 2, c0: [s.x + s.width / 2, s.y + s.height / 2], zMin: 1.1, zMax: 2.5, reserve: 0 };
  };

  it('keeps the ideal frame when nothing is near', () => {
    const c = compose(lay, want(), []);
    expect(c.cuts).toBe(0);
    expect(c.z).toBeCloseTo(2);
  });

  it('moves or zooms so a neighbour is wholly in or wholly out', () => {
    const list = pieces(lay, [neighbour], canvasRect(lay, subject));
    const ideal = cameraView(...want().c0, 2, 1920, 1080);
    expect(isCut(list[0] ?? frame, ideal, page, CLEAR)).toBe(true);
    const c = compose(lay, want(), list);
    expect(c.cuts).toBe(0);
    expect(isCut(list[0] ?? frame, cameraView(c.cx, c.cy, c.z, 1920, 1080), page, CLEAR)).toBe(false);
  });

  it('ignores the subject’s own container', () => {
    expect(pieces(lay, [item('parent', 350, 250, 500, 300)], canvasRect(lay, subject))).toEqual([]);
  });
});

describe('neighbour check', () => {
  const t = take([shot(0, rect(400, 300, 300, 120))], { scenery: [[0, [item('card', 720, 300, 200, 120)]]] });
  const f = new Framing(t, lay);

  it('flags a settled frame that cuts a neighbour, once per shot, with its edge', () => {
    const tight = Array.from({ length: 30 }, (_, i) => ({ t: i / 30, ...cameraView(...lay.toCanvas(560, 360), 2.4, 1920, 1080) }));
    const problems = neighbourCuts(f, lay, tight, 0);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/box "card" is cut at the right edge/);
  });

  it('passes the framing the composer chose', () => {
    const views = Array.from({ length: 30 }, (_, i) => ({ t: i / 30, ...cameraView(...f.target(i / 30), 1920, 1080) }));
    expect(neighbourCuts(f, lay, views, 0)).toEqual([]);
  });
});

describe('cuts land on time', () => {
  it('follows the spring curve from 0 to exactly 1', () => {
    expect(landing(0)).toBe(0);
    expect(landing(1)).toBe(1);
    for (let k = 0.1; k < 1; k += 0.1) expect(landing(k)).toBeGreaterThan(landing(k - 0.1));
  });

  it('a camera move started with cut() reaches its target at the end of its duration', () => {
    const cam = new Camera(1920, 1080, 0.2);
    cam.cut(0, 0.7);
    for (let i = 0; i <= 21; i++) cam.update([500, 300, 2], i / 30, 1 / 30);
    expect(cam.cx).toBeCloseTo(500, 6);
    expect(cam.z).toBeCloseTo(2, 6);
  });
});
