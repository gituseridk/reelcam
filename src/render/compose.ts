/** Draws one output frame: the stage and page as the camera sees them, then pointer, ripple and
 *  text overlays in screen space. */
import path from 'node:path';
import { createCanvas, loadImage, type Canvas, type Image } from '@napi-rs/canvas';
import type { Take } from '../take.js';
import { lastAtOrBefore } from './framing.js';
import { cameraView, type Camera, type Layout, type View } from './geometry.js';
import { drawOverlay, type Overlay } from './overlays.js';
import { drawArrow, drawRipple } from './pointer.js';
import { drawStage } from './stage.js';

export class Compositor {
  readonly out: Canvas;
  private readonly stage: Canvas;
  private cached: [number, Image] | null = null;
  private readonly pointerTimes: number[];
  overlays: Overlay[] = [];

  constructor(
    private readonly take: Take,
    private readonly dir: string,
    private readonly lay: Layout,
  ) {
    this.out = createCanvas(lay.preset.width, lay.preset.height);
    this.stage = drawStage(lay);
    this.pointerTimes = take.pointer.map((s) => s[0]);
  }

  async loadOverlays(): Promise<void> {
    const sprite = (name: string): Promise<Image> => loadImage(path.join(this.dir, 'sprites', name));
    const list: Overlay[] = await Promise.all(this.take.captions.map(async (c) => ({ image: await sprite(c.sprite), start: c.t, seconds: c.ms / 1000 })));
    const title = this.take.title;
    if (title !== undefined) list.push({ image: await sprite(title.sprite), start: this.take.times[0] ?? 0, seconds: title.ms / 1000 });
    this.overlays = list;
  }

  private async frame(t: number): Promise<Image> {
    const i = Math.max(0, lastAtOrBefore(this.take.times, t));
    if (this.cached?.[0] !== i) this.cached = [i, await loadImage(path.join(this.dir, 'frames', `${String(i).padStart(5, '0')}.jpg`))];
    return this.cached[1];
  }

  pointerAt(t: number): [number, number] {
    const p = this.take.pointer;
    const k = lastAtOrBefore(this.pointerTimes, t);
    const a = p[Math.max(0, k)];
    const b = p[Math.min(p.length - 1, k + 1)];
    if (a === undefined || b === undefined) return [this.take.viewport.width * 0.72, this.take.viewport.height * 0.8];
    const f = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))) : 0;
    return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  /** Draws the frame at time t and returns the camera's view of the canvas. */
  async draw(t: number, cam: Camera, clickAge: number | null): Promise<View> {
    const { preset, page } = this.lay;
    const view = cameraView(cam.cx, cam.cy, cam.z, preset.width, preset.height);
    const ctx = this.out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(cam.z, 0, 0, cam.z, -view.x * cam.z, -view.y * cam.z);
    ctx.drawImage(this.stage, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(page.x, page.y, page.width, page.height, preset.radius);
    ctx.clip();
    ctx.drawImage(await this.frame(t), page.x, page.y, page.width, page.height);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const [mx, my] = this.lay.toCanvas(...this.pointerAt(t));
    const [ox, oy] = [(mx - view.x) * cam.z, (my - view.y) * cam.z];
    const scale = (1 + 0.28 * (cam.z - 1)) * (preset.pointer.size / 30);
    if (clickAge !== null) drawRipple(ctx, preset, ox, oy, clickAge, scale);
    drawArrow(ctx, preset, ox, oy, 30 * scale * (clickAge !== null && clickAge < 0.12 ? 0.88 : 1));
    for (const o of this.overlays) drawOverlay(ctx, preset, o, t);
    return view;
  }
}
