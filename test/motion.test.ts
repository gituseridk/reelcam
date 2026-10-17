import { describe, expect, it } from 'vitest';
import { ease, glideMs, glidePoint, seeded } from '../src/record/motion.js';

describe('motion', () => {
  it('seeded random is repeatable and in [0, 1)', () => {
    const a = seeded(7);
    const b = seeded(7);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(seeded(8)()).not.toBe(seeded(7)());
  });

  it('ease runs 0 to 1 monotonically', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let last = -1;
    for (let k = 0; k <= 1; k += 0.01) {
      expect(ease(k)).toBeGreaterThanOrEqual(last);
      last = ease(k);
    }
  });

  it('a glide starts at the start, ends at the target, and stays near the line', () => {
    const g = { from: [0, 0] as [number, number], to: [400, 0] as [number, number] };
    expect(glidePoint(g, 0)).toEqual([0, 0]);
    const [x, y] = glidePoint(g, 1);
    expect(x).toBeCloseTo(400, 0);
    expect(y).toBeCloseTo(0, 5);
    for (let k = 0; k <= 1; k += 0.05) expect(Math.abs(glidePoint(g, k)[1])).toBeLessThanOrEqual(90);
  });

  it('move time grows with distance within bounds', () => {
    expect(glideMs(0)).toBe(350);
    expect(glideMs(300)).toBeGreaterThan(glideMs(100));
    expect(glideMs(5000)).toBe(950);
  });
});
