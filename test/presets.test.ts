import { describe, expect, it } from 'vitest';
import { PRESETS, getPreset } from '../src/presets/index.js';

describe('presets', () => {
  it('have unique names and sane values', () => {
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      expect(p.width % 2, `${p.name} width must be even for yuv420p`).toBe(0);
      expect(p.height % 2).toBe(0);
      expect(p.fill).toBeLessThanOrEqual(1);
      expect(p.minGain).toBeGreaterThan(1);
      expect(p.maxZoom).toBeGreaterThan(p.minGain);
      expect(p.description.length).toBeGreaterThan(10);
    }
  });

  it('finds by name and lists the choices on a miss', () => {
    expect(getPreset('vertical').height).toBe(1920);
    expect(() => getPreset('nope')).toThrow(/unknown preset "nope"/);
    try {
      getPreset('nope');
    } catch (error) {
      expect((error as { hint?: string }).hint).toContain('studio');
    }
  });
});
