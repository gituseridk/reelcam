/** The title pill (first seconds) and captions, bottom centre where apps keep the least, faded in and out. */
import type { Image, SKRSContext2D } from '@napi-rs/canvas';
import type { Preset } from '../presets/index.js';
import type { Band } from './framing.js';

export interface Overlay {
  image: Image;
  start: number;
  seconds: number;
}

const FADE_IN = 0.25;
const FADE_OUT = 0.35;

/** Opacity at `age` seconds into an overlay that lasts `seconds`. */
export function fade(age: number, seconds: number): number {
  if (age < 0 || age > seconds) return 0;
  return Math.max(0, Math.min(1, age / FADE_IN, (seconds - age) / FADE_OUT));
}

/** Canvas px from the bottom edge to the overlay's top (its pill plus the gap below it). */
export function overlayTop(preset: Preset, imageHeight: number): number {
  const unit = preset.width / 1920;
  return preset.height - preset.margin - 56 * unit - imageHeight;
}

/** The band a camera must keep clear while the overlay shows: from its top, plus a little air, down. */
export function bandOf(preset: Preset, o: Overlay): Band {
  return { start: o.start, end: o.start + o.seconds, height: preset.height - overlayTop(preset, o.image.height) + 16 * (preset.width / 1920) };
}

export function drawOverlay(ctx: SKRSContext2D, preset: Preset, o: Overlay, t: number): void {
  const a = fade(t - o.start, o.seconds);
  if (a <= 0) return;
  const lift = (1 - Math.min(1, (t - o.start) / FADE_IN)) * 14;
  const x = (preset.width - o.image.width) / 2;
  const y = overlayTop(preset, o.image.height) + lift;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(o.image, Math.round(x), Math.round(y));
  ctx.restore();
}
