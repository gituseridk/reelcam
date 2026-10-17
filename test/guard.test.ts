import { describe, expect, it } from 'vitest';
import { findHits, redactCss } from '../src/record/guard.js';
import { fade } from '../src/render/overlays.js';
import { planStills } from '../src/render/sheet.js';
import { clickAge } from '../src/render/render.js';
import { closeFrames } from '../src/record/files.js';
import { rect, shot } from './helpers.js';

describe('redaction and content guard', () => {
  it('blurs every selector, and nothing when none', () => {
    expect(redactCss([])).toBe('');
    const css = redactCss(['input[type=password]', '.email']);
    expect(css).toContain('input[type=password]');
    expect(css).toContain('.email');
    expect(css).toContain('blur(');
  });

  it('finds each forbidden pattern once, case-insensitively', () => {
    const seen = new Set<string>();
    const patterns = [/lorem/i, /\bTODO\b/i];
    expect(findHits('Hello\nLorem ipsum\nok', patterns, seen)).toEqual([{ text: 'Lorem ipsum', pattern: 'lorem' }]);
    expect(findHits('lorem again', patterns, seen)).toEqual([]);
    expect(findHits('a todo here', patterns, seen)).toHaveLength(1);
  });
});

describe('small render helpers', () => {
  it('fades overlays in and out', () => {
    expect(fade(-0.1, 2)).toBe(0);
    expect(fade(0, 2)).toBe(0);
    expect(fade(1, 2)).toBe(1);
    expect(fade(2.1, 2)).toBe(0);
    expect(fade(1.9, 2)).toBeLessThan(1);
  });

  it('plans four stills per shot, in order, inside the take', () => {
    const stills = planStills([shot(0, rect(0, 0, 1, 1)), shot(3, rect(0, 0, 1, 1))], 0, 6);
    expect(stills).toHaveLength(8);
    expect(stills.every((s) => s.t >= 0 && s.t < 6)).toBe(true);
    expect(stills.map((s) => s.t)).toEqual([...stills.map((s) => s.t)].sort((a, b) => a - b));
  });

  it('measures the age of the newest click', () => {
    expect(clickAge([], 1)).toBeNull();
    expect(clickAge([[1, 0, 0], [2, 0, 0]], 2.5)).toBeCloseTo(0.5);
    expect(clickAge([[3, 0, 0]], 2.5)).toBeNull();
  });

  it('repeats the last frame at the real end of a still hold', () => {
    expect(closeFrames([{ data: 'a', t: 1 }], 3)).toEqual([{ data: 'a', t: 1 }, { data: 'a', t: 3 }]);
    expect(closeFrames([], 3)).toEqual([]);
  });
});
