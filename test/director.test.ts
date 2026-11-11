/** The director keeps a shot only when something happened on camera while it lasted. */
import type { Page } from 'playwright';
import { describe, expect, it } from 'vitest';
import { Director } from '../src/record/director.js';
import { sleep } from '../src/take.js';

const page = { viewportSize: () => ({ width: 1280, height: 720 }) } as unknown as Page;

describe('director', () => {
  it('drops a shot replaced before anything happened, however slow the machine', async () => {
    const director = new Director(page);
    await director.shot('start', 'window', 'the whole page');
    await sleep(150); // a slow runner measuring the next subject
    await director.shot('first', { area: [0, 0, 0.5, 0.5] }, 'the first subject');
    expect(director.shots.map((s) => s.name)).toEqual(['first']);
  });

  it('keeps a shot that was seen, however brief', async () => {
    const director = new Director(page);
    await director.shot('start', 'window', 'the whole page');
    director.seen();
    await director.shot('next', 'window', 'again');
    expect(director.shots.map((s) => s.name)).toEqual(['start', 'next']);
  });
});
