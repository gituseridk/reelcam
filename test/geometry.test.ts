import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import { Camera, Layout, cameraView, spring } from '../src/render/geometry.js';

describe('Layout', () => {
  it('fits the page inside the margins, centred', () => {
    const lay = new Layout(getPreset('studio'), { width: 1440, height: 810 });
    expect(lay.page.height).toBeCloseTo(1080 - 44);
    expect(lay.page.x).toBeCloseTo((1920 - lay.page.width) / 2);
    expect(lay.toCanvas(0, 0)).toEqual([lay.page.x, lay.page.y]);
  });

  it('fills the frame with the bare preset', () => {
    const lay = new Layout(getPreset('bare'), { width: 1440, height: 810 });
    expect(lay.page).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it('fits a phone viewport by height on the vertical preset', () => {
    const lay = new Layout(getPreset('vertical'), { width: 390, height: 844 });
    expect(lay.page.width).toBeLessThanOrEqual(1080 - 120 + 1e-6);
    expect(lay.page.y).toBeGreaterThanOrEqual(60 - 1e-6);
  });
});

describe('cameraView', () => {
  it('is the whole canvas at zoom 1', () => {
    expect(cameraView(960, 540, 1, 1920, 1080)).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it('never leaves the canvas', () => {
    const v = cameraView(10, 10, 2, 1920, 1080);
    expect(v).toEqual({ x: 0, y: 0, width: 960, height: 540 });
    const w = cameraView(1910, 1070, 2, 1920, 1080);
    expect(w.x + w.width).toBe(1920);
    expect(w.y + w.height).toBe(1080);
  });
});

describe('spring', () => {
  it('halves the distance in one half-life with no overshoot', () => {
    let x = 0;
    let v = 0;
    const dt = 1 / 300;
    const trace: number[] = [];
    for (let i = 0; i < 600; i++) {
      [x, v] = spring(x, v, 100, 0.2, dt);
      trace.push(x);
    }
    expect(Math.max(...trace)).toBeLessThanOrEqual(100);
    expect(x).toBeCloseTo(100, 1);
  });

  it('moves the camera to its target and settles', () => {
    const cam = new Camera(1920, 1080, 0.2);
    for (let i = 0; i < 90; i++) cam.step([500, 300, 2], 1 / 30);
    expect(cam.cx).toBeCloseTo(500, 0);
    expect(cam.cy).toBeCloseTo(300, 0);
    expect(cam.z).toBeCloseTo(2, 2);
  });
});
