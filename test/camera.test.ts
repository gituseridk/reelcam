/** The camera's newer moves: breathing, frame-filling wide shots, pulling back for captions,
 *  leading the cut, keeping the next subject whole on the way, and the pointer easing off. */
import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { DRIFT } from '../src/record/actor.js';
import { Framing } from '../src/render/framing.js';
import { Camera, Layout, cameraView, wideZoom } from '../src/render/geometry.js';
import { rect, shot, take } from './helpers.js';

const studio = getPreset('studio');
const lay = new Layout(studio, { width: 1440, height: 810 });

describe('wide shots', () => {
  it('fill the frame when only the stage margin would be cropped', () => {
    expect(wideZoom(lay)).toBeGreaterThan(1);
    expect(wideZoom(lay) * lay.page.width).toBeGreaterThanOrEqual(1920 - 1e-6);
  });

  it('keep the whole stage when filling would crop the page (phone page on 16:9)', () => {
    expect(wideZoom(new Layout(studio, { width: 390, height: 844 }))).toBe(1);
  });

  it('do not pull back when nothing lies under the caption band', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true })]), lay, [{ start: 1, end: 3, height: 200 }]);
    expect(f.target(2)[2]).toBeGreaterThan(1);
  });

  it('breathe: a slow push-in from the cut, then hold', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true })]), lay);
    expect(f.breath(0)).toBe(1);
    expect(f.breath(2.5)).toBeGreaterThan(1);
    expect(f.breath(5)).toBeCloseTo(1 + studio.breathe);
    expect(f.breath(9)).toBeCloseTo(1 + studio.breathe);
  });

  it('pull back so the whole page sits above a caption band', () => {
    const footer = { kind: 'text' as const, label: 'footer', rect: rect(600, 780, 200, 20) }; // under the band
    const t = take([shot(0, rect(0, 0, 1440, 810), { window: true })], { scenery: [[0, [footer]]] });
    const f = new Framing(t, lay, [{ start: 1, end: 3, height: 200 }]);
    const [, cy, z] = f.target(2);
    expect(z).toBeLessThan(1);
    const view = cameraView(960, cy, z, 1920, 1080);
    const pageBottom = (lay.page.y + lay.page.height - view.y) * z;
    expect(pageBottom).toBeLessThanOrEqual(1080 - 200 + 1e-6);
  });
});

describe('moves between shots', () => {
  const f = new Framing(take([shot(0, rect(100, 80, 300, 60)), shot(3, rect(900, 600, 300, 100))]), lay);

  it('lead the cut: the camera heads for the next shot before it starts', () => {
    const before = 3 - studio.lead / 2;
    expect(f.aim(before, 0, 0)[0]).toBe(f.target(3.1)[0]);
  });

  it('cap the zoom so the next subject stays whole from where the camera is', () => {
    const [cx, cy] = lay.toCanvas(250, 110); // still on the first subject
    const z = f.aim(3, cx, cy)[2];
    expect(z).toBeLessThan(f.target(3.1)[2]);
    const v = cameraView(cx, cy, z, 1920, 1080);
    const [x1, y1] = lay.toCanvas(1200, 700);
    expect(x1).toBeLessThanOrEqual(v.x + v.width + 1);
    expect(y1).toBeLessThanOrEqual(v.y + v.height + 1);
  });

  it('pull out faster than they push in', () => {
    const outCam = new Camera(1920, 1080, 0.2);
    outCam.z = 2;
    const inCam = new Camera(1920, 1080, 0.2);
    for (let i = 0; i < 6; i++) {
      outCam.step([960, 540, 1], 1 / 30);
      inCam.step([960, 540, 2], 1 / 30);
    }
    expect(Math.log(2) - Math.log(outCam.z)).toBeGreaterThan(Math.log(inCam.z));
  });
});

describe('camera view', () => {
  it('may pass the bottom edge by the eased caption slack', () => {
    expect(cameraView(960, 1000, 2, 1920, 1080, 0).y).toBe(540);
    expect(cameraView(960, 1000, 2, 1920, 1080, 100).y).toBe(640);
    const cam = new Camera(1920, 1080, 0.2);
    for (let i = 0; i < 60; i++) cam.step([960, 540, 1], 1 / 30, 120);
    expect(cam.slack).toBeCloseTo(120, 0);
  });

  it('centres the stage when zoomed out below 1', () => {
    const v = cameraView(960, 540, 0.8, 1920, 1080);
    expect(v.x).toBeCloseTo(-240);
    expect(v.width).toBeCloseTo(2400);
  });
});

describe('pointer', () => {
  it('eases off down and to the right after a click', () => {
    expect(DRIFT[0]).toBeGreaterThan(0);
    expect(DRIFT[1]).toBeGreaterThan(0);
  });
});
