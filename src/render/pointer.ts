/** The pointer, drawn crisp in post as a vector arrow, and the click ripple. */
import type { SKRSContext2D } from '@napi-rs/canvas';
import type { Preset } from '../presets/index.js';

const ARROW: readonly [number, number][] = [
  [0, 0],
  [0, 0.86],
  [0.2, 0.68],
  [0.34, 1.02],
  [0.5, 0.95],
  [0.37, 0.62],
  [0.66, 0.62],
];

/** Draws the arrow with its tip at (x, y), `size` px tall. */
export function drawArrow(ctx: SKRSContext2D, preset: Preset, x: number, y: number, size: number): void {
  ctx.save();
  ctx.beginPath();
  for (const [i, [ax, ay]] of ARROW.entries()) {
    const px = x + ax * size;
    const py = y + ay * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillStyle = preset.pointer.fill;
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, size * 0.065);
  ctx.strokeStyle = preset.pointer.stroke;
  ctx.stroke();
  ctx.restore();
}

/** A ring that grows and fades over 0.5 s after a click; `age` is seconds since the click. */
export function drawRipple(ctx: SKRSContext2D, preset: Preset, x: number, y: number, age: number, scale: number): void {
  if (age < 0 || age >= 0.5) return;
  const k = age / 0.5;
  const radius = (10 + 46 * (1 - (1 - k) ** 3)) * scale;
  ctx.save();
  ctx.globalAlpha = 1 - k;
  ctx.strokeStyle = preset.ripple;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
