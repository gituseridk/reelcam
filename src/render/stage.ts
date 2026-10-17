/** The stage behind the page (a gradient with the page's soft shadow), drawn once per video. */
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type { Layout } from './geometry.js';

export function drawStage(lay: Layout): Canvas {
  const { preset, page } = lay;
  const canvas = createCanvas(preset.width, preset.height);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, preset.width, preset.height);
  g.addColorStop(0, preset.background.from);
  g.addColorStop(1, preset.background.to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, preset.width, preset.height);
  if (preset.shadow.blur > 0) {
    ctx.save();
    ctx.shadowColor = preset.shadow.color;
    ctx.shadowBlur = preset.shadow.blur;
    ctx.shadowOffsetY = preset.shadow.offsetY;
    ctx.fillStyle = preset.background.to;
    ctx.beginPath();
    ctx.roundRect(page.x, page.y, page.width, page.height, preset.radius);
    ctx.fill();
    ctx.restore();
  }
  return canvas;
}
