/** Resolves a drag point: a selector's centre, or [x, y] fractions of an element (or of the page). */
import type { Page } from 'playwright';
import { UserError } from '../errors.js';
import type { Point } from '../script/steps.js';

const VISIBLE = 10_000;

export async function resolvePoint(page: Page, point: Point, on: string | undefined): Promise<[number, number]> {
  if (typeof point === 'string') {
    const target = page.locator(point).first();
    await target.waitFor({ state: 'visible', timeout: VISIBLE });
    const box = await target.boundingBox();
    if (box === null) throw new UserError(`drag: "${point}" has no box on the page`);
    return [box.x + box.width / 2, box.y + box.height / 2];
  }
  let area = { x: 0, y: 0, ...(page.viewportSize() ?? { width: 0, height: 0 }) };
  if (on !== undefined) {
    const target = page.locator(on).first();
    await target.waitFor({ state: 'visible', timeout: VISIBLE });
    const box = await target.boundingBox();
    if (box === null) throw new UserError(`drag: "${on}" has no box on the page`);
    area = box;
  }
  return [area.x + area.width * point[0], area.y + area.height * point[1]];
}
