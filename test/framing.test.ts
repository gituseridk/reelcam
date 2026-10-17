import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { Framing, lastAtOrBefore, union } from '../src/render/framing.js';
import { Layout } from '../src/render/geometry.js';
import { rect, shot, take } from './helpers.js';

const lay = new Layout(getPreset('studio'), { width: 1440, height: 810 });

describe('helpers', () => {
  it('union covers both boxes', () => {
    expect(union(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(0, 0, 15, 15));
  });

  it('lastAtOrBefore finds the last index <= t', () => {
    expect(lastAtOrBefore([1, 2, 3], 0)).toBe(-1);
    expect(lastAtOrBefore([1, 2, 3], 2)).toBe(1);
    expect(lastAtOrBefore([1, 2, 3], 9)).toBe(2);
    expect(lastAtOrBefore([], 1)).toBe(-1);
  });
});

describe('Framing.target', () => {
  it('rests on the whole canvas for window shots', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true })]), lay);
    expect(f.target(1)).toEqual([960, 540, 1]);
  });

  it('zooms on a small subject with air on every side, capped at maxZoom', () => {
    const f = new Framing(take([shot(0, rect(100, 100, 400, 100))]), lay);
    const [cx, cy, z] = f.target(1);
    expect(z).toBeCloseTo(2.2);
    expect([cx, cy]).toEqual(lay.toCanvas(300, 150));
  });

  it('fits a wide subject to 88% of the frame width', () => {
    const f = new Framing(take([shot(0, rect(0, 300, 1000, 50))]), lay);
    const z = f.target(1)[2];
    expect(1000 * lay.s * z).toBeCloseTo(0.88 * 1920);
  });

  it('skips a zoom that gains less than 12%', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1400, 780))]), lay);
    expect(f.target(1)[2]).toBe(1);
  });

  it('honours an explicit zoom level below the fit', () => {
    const f = new Framing(take([shot(0, rect(100, 100, 100, 50), { zoom: 1.5 })]), lay);
    expect(f.target(1)[2]).toBe(1.5);
  });

  it('holds the first shot before its cut', () => {
    const f = new Framing(take([shot(5, rect(100, 100, 400, 100))]), lay);
    expect(f.target(0)).toEqual(f.target(6));
  });

  it('grows with the subject and never shrinks back', () => {
    const t = take([shot(0, rect(100, 100, 800, 100))], { subjects: [[1, 0, rect(100, 100, 800, 500)], [2, 0, rect(100, 100, 800, 100)]] });
    const f = new Framing(t, lay);
    const zBefore = f.target(0.5)[2];
    const zGrown = f.target(1.5)[2];
    expect(zGrown).toBeLessThan(zBefore);
    expect(f.target(2.5)[2]).toBe(zGrown);
  });

  it('reserves room at the bottom for a caption shown during the shot', () => {
    const plain = new Framing(take([shot(0, rect(0, 200, 600, 400))]), lay).target(1);
    const reserved = new Framing(take([shot(0, rect(0, 200, 600, 400))]), lay, [{ start: 3, end: 5, height: 150 }]).target(1);
    expect(reserved[2]).toBeLessThan(plain[2]);
    expect(reserved[1]).toBeGreaterThan(plain[1]);
  });
});
