/** The hand of a take: a pointer that moves like a person on the real page (curved, eased, a
 *  dwell before each click) and logs every position and click on the take's clock. */
import type { Locator, Page } from 'playwright';
import { UserError } from '../errors.js';
import { now, sleep } from '../take.js';
import { ease, glideMs, glidePoint } from './motion.js';

export type Sample = [number, number, number];

/** After a click the pointer drifts this far (px, down and right) so it does not hide what changed. */
export const DRIFT: readonly [number, number] = [34, 30];

export class Actor {
  x: number;
  y: number;
  readonly pointer: Sample[] = [];
  readonly clicks: Sample[] = [];

  constructor(
    private readonly page: Page,
    private readonly random: () => number,
    start: [number, number],
  ) {
    [this.x, this.y] = start;
  }

  sample(): void {
    this.pointer.push([now(), this.x, this.y]);
  }

  /** The centre of a visible element, scrolled into view first. */
  async centre(target: Locator): Promise<[number, number]> {
    await target.scrollIntoViewIfNeeded({ timeout: 10_000 });
    const box = await target.boundingBox();
    if (box === null) throw new UserError('the element has no box on the page (is it hidden?)');
    return [box.x + box.width / 2, box.y + box.height / 2];
  }

  async glide(to: [number, number], ms: number): Promise<void> {
    const from: [number, number] = [this.x, this.y];
    const t0 = performance.now();
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / ms);
      [this.x, this.y] = glidePoint({ from, to }, k);
      await this.page.mouse.move(this.x, this.y);
      this.sample();
      if (k >= 1) break;
      await sleep(4);
    }
    [this.x, this.y] = to;
    await this.page.mouse.move(this.x, this.y);
    this.sample();
  }

  async moveTo(target: Locator): Promise<void> {
    const to = await this.centre(target);
    await this.glide(to, glideMs(Math.hypot(to[0] - this.x, to[1] - this.y)));
  }

  async click(target: Locator): Promise<void> {
    await this.moveTo(target);
    await this.tap();
  }

  /** Clicks a point on the page (for canvas apps): moves there like a person, then clicks. */
  async clickAt(to: [number, number]): Promise<void> {
    await this.glide(to, glideMs(Math.hypot(to[0] - this.x, to[1] - this.y)));
    await this.tap();
  }

  private async tap(): Promise<void> {
    await this.wait(200);
    this.clicks.push([now(), this.x, this.y]);
    await this.page.mouse.down();
    await sleep(60);
    await this.page.mouse.up();
    await this.wait(120);
    await this.glide([this.x + DRIFT[0], this.y + DRIFT[1]], 300); // the hand eases off, uncovering the result
  }

  /** Presses at `from`, moves to `to` in `ms` along an eased path, and releases (draw, drag and drop). */
  async drag(from: [number, number], to: [number, number], ms: number): Promise<void> {
    await this.glide(from, glideMs(Math.hypot(from[0] - this.x, from[1] - this.y)));
    await this.wait(150);
    this.clicks.push([now(), this.x, this.y]);
    await this.page.mouse.down();
    await this.wait(80);
    await this.glide(to, ms);
    await this.wait(80);
    await this.page.mouse.up();
    await this.wait(120);
    await this.glide([this.x + DRIFT[0], this.y + DRIFT[1]], 300);
  }

  /** Types like a person: one key at a time, `delay` ms apart with a little seeded jitter. */
  async type(text: string, delay: number): Promise<void> {
    for (const ch of text) {
      if (ch === '\n') await this.page.keyboard.press('Shift+Enter');
      else await this.page.keyboard.type(ch);
      await this.wait(delay + this.random() * delay * 0.8);
    }
  }

  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
    await this.wait(300);
  }

  /** A wheel scroll over the pointer, `dy` px in `ms`, eased. */
  async scroll(dy: number, ms: number): Promise<void> {
    const t0 = performance.now();
    let done = 0;
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
      const want = dy * ease(k);
      await this.page.mouse.wheel(0, want - done);
      done = want;
      this.sample();
      if (k >= 1) break;
      await sleep(12);
    }
  }

  /** Waits while still sampling the pointer, so the take's clock has no gaps. */
  async wait(ms: number): Promise<void> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      this.sample();
      await sleep(Math.min(30, Math.max(0, end - performance.now())));
    }
  }
}
