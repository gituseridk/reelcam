/** The contact sheet: for every shot, a still just after the cut, once settled, mid-shot and at
 *  its end, tiled with labels. It is how a person (or an agent) checks a video at a glance. */
import { writeFile } from 'node:fs/promises';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type { Shot } from '../take.js';

export interface Still {
  t: number;
  label: string;
  image?: Canvas;
}

const COLS = 4;
const THUMB_W = 640;
const LABEL_H = 30;

/** The moments to capture, in time order. */
export function planStills(shots: readonly Shot[], t0: number, t1: number): Still[] {
  const out: Still[] = [];
  for (const [i, s] of shots.entries()) {
    const end = shots[i + 1]?.t ?? t1;
    const moments: [string, number][] = [['cut', s.t + 0.15], ['settled', s.t + 1.0], ['mid', (s.t + end) / 2], ['end', end - 0.15]];
    for (const [tag, t] of moments) {
      const at = Math.min(Math.max(t, t0), t1 - 0.05);
      out.push({ t: at, label: `${String(i + 1)} ${s.name.slice(0, 34)} | ${tag} ${(at - t0).toFixed(1)}s` });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Copies `frame` into every still whose moment falls in [t, t + dt). */
export function capture(stills: Still[], frame: Canvas, t: number, dt: number): void {
  for (const s of stills) {
    if (s.image !== undefined || s.t < t || s.t >= t + dt) continue;
    const thumb = createCanvas(THUMB_W, Math.round((THUMB_W * frame.height) / frame.width));
    const ctx = thumb.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frame, 0, 0, thumb.width, thumb.height);
    s.image = thumb;
  }
}

export async function writeSheet(stills: readonly Still[], file: string): Promise<void> {
  const done = stills.filter((s): s is Required<Still> => s.image !== undefined);
  const first = done[0];
  if (first === undefined) return;
  const th = first.image.height;
  const rows = Math.ceil(done.length / COLS);
  const sheet = createCanvas(COLS * THUMB_W, rows * (th + LABEL_H));
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#14141c';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffffff';
  for (const [n, s] of done.entries()) {
    const x = (n % COLS) * THUMB_W;
    const y = Math.floor(n / COLS) * (th + LABEL_H);
    ctx.fillText(s.label, x + 8, y + 21);
    ctx.drawImage(s.image, x, y + LABEL_H);
  }
  await writeFile(file, await sheet.encode('png'));
}
