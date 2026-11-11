import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { checkFraming, subjectAt, type ViewAt } from '../src/render/check.js';
import { Framing } from '../src/render/framing.js';
import { Layout, cameraView } from '../src/render/geometry.js';
import { rect, shot, take } from './helpers.js';

const lay = new Layout(getPreset('studio'), { width: 1440, height: 810 });

/** Views of a camera that sits exactly on each target (as a settled camera would). */
function settledViews(f: Framing, t1: number): ViewAt[] {
  const views: ViewAt[] = [];
  for (let t = 0; t < t1; t += 1 / 30) {
    const [cx, cy, z] = f.target(t);
    views.push({ t, ...cameraView(cx, cy, z, 1920, 1080) });
  }
  return views;
}

describe('checkFraming', () => {
  it('passes a well framed take', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true }), shot(2, rect(100, 100, 400, 100))]), lay);
    expect(checkFraming(f, lay, settledViews(f, 5), [[3, 300, 150]], [0, 5])).toEqual([]);
  });

  it('flags a shot held too briefly', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true }), shot(1, rect(100, 100, 400, 100)), shot(1.5, rect(0, 0, 1440, 810), { window: true })]), lay);
    const problems = checkFraming(f, lay, settledViews(f, 4), [], [0, 4]);
    expect(problems.join('\n')).toMatch(/held only 0.50 s/);
  });

  it('flags a cropped subject once the camera has settled', () => {
    const f = new Framing(take([shot(0, rect(100, 100, 400, 100))]), lay);
    const tight: ViewAt[] = Array.from({ length: 90 }, (_, i) => ({ t: i / 30, x: 600, y: 300, width: 200, height: 100 }));
    expect(checkFraming(f, lay, tight, [], [0, 3]).join('\n')).toMatch(/subject is cropped/);
  });

  it('gives a growing subject a grace period', () => {
    const t = take([shot(0, rect(100, 100, 400, 100))], { subjects: [[2, 0, rect(100, 100, 400, 600)]] });
    const f = new Framing(t, lay);
    const stale: ViewAt[] = [{ t: 2.2, ...cameraView(...f.target(1), 1920, 1080) }];
    expect(checkFraming(f, lay, stale, [], [0, 3]).filter((p) => p.includes('cropped'))).toEqual([]);
    expect(subjectAt(f, 0, 2.2)?.changed).toBe(2);
  });

  it('flags a click outside the frame', () => {
    const f = new Framing(take([shot(0, rect(100, 100, 400, 100))]), lay);
    expect(checkFraming(f, lay, settledViews(f, 3), [[2, 1400, 800]], [0, 3]).join('\n')).toMatch(/click happens outside/);
  });
});
