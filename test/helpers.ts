import type { Rect, Shot, Take } from '../src/take.js';

export const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

export function shot(t: number, r: Rect, extra: Partial<Shot> = {}): Shot {
  return { t, name: `shot@${String(t)}`, why: '', window: false, rect: r, ...extra };
}

export function take(shots: Shot[], extra: Partial<Take> = {}): Take {
  return { version: 1, viewport: { width: 1440, height: 810 }, scale: 2, times: [0, 10], pointer: [], clicks: [], shots, subjects: [], captions: [], hits: [], scenery: [], ...extra };
}
