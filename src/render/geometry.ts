/** Where the page sits on the output canvas, the camera's view rectangle, and the camera spring. */
import type { Preset } from '../presets/index.js';

export interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Layout {
  /** Page px to output px. */
  readonly s: number;
  readonly page: View;

  constructor(
    readonly preset: Preset,
    viewport: { width: number; height: number },
  ) {
    const m = preset.margin;
    this.s = Math.min((preset.width - 2 * m) / viewport.width, (preset.height - 2 * m) / viewport.height);
    const width = viewport.width * this.s;
    const height = viewport.height * this.s;
    this.page = { x: (preset.width - width) / 2, y: (preset.height - height) / 2, width, height };
  }

  /** A point in page px, on the output canvas (camera at rest). */
  toCanvas(x: number, y: number): [number, number] {
    return [this.page.x + x * this.s, this.page.y + y * this.s];
  }
}

/** The zoom of a wide shot: the page fills the frame when that crops at most 6% of it (the stage
 *  margin), else the whole stage shows (a phone page on a 16:9 canvas). */
export function wideZoom(lay: Layout): number {
  const { preset, page } = lay;
  const cover = Math.max(preset.width / page.width, preset.height / page.height);
  const crop = 1 - Math.min(preset.width / page.width, preset.height / page.height) / cover;
  return crop <= 0.06 ? cover : 1;
}

/** The part of the canvas a camera at (cx, cy) with zoom z sees, kept inside the canvas. */
export function cameraView(cx: number, cy: number, z: number, w: number, h: number, slack = 0): View {
  const width = w / z;
  const height = h / z;
  // Zoomed in: the view stays on the canvas. Zoomed out (below 1): it is free; the stage extends.
  const x = width <= w ? Math.min(Math.max(cx - width / 2, 0), w - width) : cx - width / 2;
  // `slack` lets the view go past the bottom edge, onto the stage, to leave room for a caption.
  const y = height <= h ? Math.min(Math.max(cy - height / 2, 0), h - height + slack) : cy - height / 2;
  return { x, y, width, height };
}

/** One step of a critically damped spring with half-life `half` seconds: fast start, soft landing. */
export function spring(x: number, v: number, target: number, half: number, dt: number): [number, number] {
  const w = (2 * Math.log(2)) / half;
  const e = Math.exp(-w * dt);
  const err = x - target;
  const tmp = (v + w * err) * dt;
  return [target + (err + tmp) * e, (v - w * tmp) * e];
}

/** Camera state (cx, cy, zoom) that follows a target on springs; zoom moves in log space. */
export class Camera {
  cx: number;
  cy: number;
  z = 1;
  /** Canvas px the view may pass the bottom edge by (eased, so the room for a caption opens smoothly). */
  slack = 0;
  private v: [number, number, number] = [0, 0, 0];
  private vSlack = 0;

  constructor(
    w: number,
    h: number,
    private readonly half: number,
  ) {
    this.cx = w / 2;
    this.cy = h / 2;
  }

  step(target: [number, number, number], dt: number, slack = 0): void {
    [this.slack, this.vSlack] = spring(this.slack, this.vSlack, slack, this.half, dt);
    [this.cx, this.v[0]] = spring(this.cx, this.v[0], target[0], this.half * 0.9, dt);
    [this.cy, this.v[1]] = spring(this.cy, this.v[1], target[1], this.half * 0.9, dt);
    // Pulling out is quicker than pushing in, so the next subject is whole sooner.
    const half = target[2] < this.z ? this.half * 0.55 : this.half;
    const [lz, vz] = spring(Math.log(this.z), this.v[2], Math.log(target[2]), half, dt);
    this.z = Math.exp(lz);
    this.v[2] = vz;
  }
}
