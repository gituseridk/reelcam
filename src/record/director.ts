/** The director of a take: names each camera shot and keeps measuring its subject while the shot
 *  lasts, so the renderer frames the whole subject even when it grows. Rules: README "Camera". */
import type { Locator, Page } from 'playwright';
import { UserError, describe } from '../errors.js';
import { log } from '../log.js';
import { now, sleep, type Rect, type Shot } from '../take.js';

export type Subject = 'window' | Locator;

export class Director {
  readonly shots: Shot[] = [];
  readonly subjects: [number, number, Rect][] = [];
  private token: object | null = null;
  private sampler: Promise<void> = Promise.resolve();

  constructor(private readonly page: Page) {}

  /** The subject's box in page px, clipped to the window; null when it is not on the page. */
  async rect(subject: Subject): Promise<Rect | null> {
    const vp = this.page.viewportSize();
    if (vp === null) throw new UserError('the page has no viewport size');
    if (subject === 'window') return { x: 0, y: 0, width: vp.width, height: vp.height };
    const box = await subject.boundingBox({ timeout: 400 }).catch((error: unknown) => {
      log.debug(`subject not measurable now: ${describe(error)}`);
      return null;
    });
    if (box === null) return null;
    const x0 = Math.max(0, box.x);
    const y0 = Math.max(0, box.y);
    const x1 = Math.min(vp.width, box.x + box.width);
    const y1 = Math.min(vp.height, box.y + box.height);
    if (x1 <= x0 || y1 <= y0) return null;
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }

  /** From now on the camera frames `subject`, whole, until the next shot. */
  async shot(name: string, subject: Subject, why: string, zoom?: number): Promise<void> {
    await this.stop();
    const rect = await this.rect(subject);
    if (rect === null) throw new UserError(`shot "${name}": the subject is not visible on the page`, 'Scroll it into view first, or wait for it with "waitFor".');
    this.dropInstantShot();
    const index = this.shots.length;
    this.shots.push({ t: now(), name, why, window: subject === 'window', rect, ...(zoom === undefined ? {} : { zoom }) });
    if (subject === 'window') return;
    const token = {};
    this.token = token;
    this.sampler = this.sample(subject, index, token);
  }

  /** A shot replaced in the same instant (e.g. the automatic start shot) was never seen: drop it. */
  private dropInstantShot(): void {
    const last = this.shots.at(-1);
    if (last === undefined || now() - last.t > 0.05) return;
    const index = this.shots.length - 1;
    this.shots.pop();
    for (let i = this.subjects.length - 1; i >= 0; i--) if (this.subjects[i]?.[1] === index) this.subjects.splice(i, 1);
  }

  private async sample(subject: Locator, index: number, token: object): Promise<void> {
    while (this.token === token) {
      const r = await this.rect(subject);
      if (r !== null && this.token === token) this.subjects.push([now(), index, r]);
      await sleep(100);
    }
  }

  /** Stops measuring the current subject and waits for the sampler to finish. */
  async stop(): Promise<void> {
    this.token = null;
    await this.sampler;
  }
}
