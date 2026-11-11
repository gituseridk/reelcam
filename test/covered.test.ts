/** Captions and the subject: the check fails a caption over what the shot frames (on any frame
 *  where it shows, fades included), and a wide shot keeps its pull-back until the caption is gone.
 *  The wide case is the chat app from the launch review: the caption ended 1 s before the video,
 *  the camera zoomed back in under it, and the check passed. */
import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/presets/index.js';
import type { ViewAt } from '../src/render/check.js';
import { covered } from '../src/render/covered.js';
import { Framing, REHOLD, type Band } from '../src/render/framing.js';
import { Layout, cameraView } from '../src/render/geometry.js';
import type { Item } from '../src/take.js';
import { rect, shot, take } from './helpers.js';

const studio = getPreset('studio');
const lay = new Layout(studio, { width: 1440, height: 810 });
const box: Item = { kind: 'box', label: 'message box', rect: rect(400, 640, 640, 120) }; // low on the page
const caption: Band = { start: 4, end: 6, height: 220, width: 900 };

/** Views of a camera sitting on `aim` at each frame. */
function views(t1: number, aim: (t: number) => [number, number, number]): ViewAt[] {
  return Array.from({ length: Math.floor(t1 * 30) }, (_, k) => ({ t: k / 30, ...cameraView(...aim(k / 30), 1920, 1080) }));
}

/** The chat: a wide shot with a message box low on the page; the video ends at `end`. */
function chat(end: number, bands: Band[] = [caption]): Framing {
  return new Framing(take([shot(0, rect(0, 0, 1440, 810), { window: true })], { times: [0, end], scenery: [[0, [box]]] }), lay, bands);
}

describe('the caption check', () => {
  it('fails a caption over a focused subject', () => {
    const f = new Framing(take([shot(0, rect(0, 0, 1440, 700))]), lay, [{ start: 1, end: 3, height: 400 }]);
    const plain = new Framing(take([shot(0, rect(0, 0, 1440, 700))]), lay);
    expect(covered(f, lay, views(3, (t) => plain.target(t)), 0).join('\n')).toMatch(/caption covers the subject/);
  });

  it('fails a caption over a piece of the page in a wide shot', () => {
    const still = chat(7, []);
    expect(covered(chat(7), lay, views(7, (t) => still.target(t)), 0)).toEqual([`t=4.03 s, shot "shot@0": a caption covers a piece of the page`]);
  });

  it('fails a caption that covers the subject only while it fades out', () => {
    const f = chat(9);
    const still = chat(9, []);
    const zoomsInEarly = views(9, (t) => (t < caption.end - 0.2 ? f.target(t) : still.target(t)));
    expect(covered(f, lay, zoomsInEarly, 0).join('\n')).toMatch(/t=5\.8\d s.*covers a piece of the page/);
  });

  it('passes a wide shot that pulls back for the caption', () => {
    const f = chat(7);
    expect(f.target(5)[2]).toBeLessThan(1);
    expect(covered(f, lay, views(7, (t) => f.target(t)), 0)).toEqual([]);
  });

  it('never zooms back in under the caption, even looking a move ahead', () => {
    const f = chat(9);
    const [cx, cy] = [960, 540];
    for (const t of [caption.end - studio.lead, caption.end - 0.3, caption.end]) expect(f.aim(t, cx, cy)).toEqual(f.target(5));
  });

  it('holds the pull-back to the end when the caption ends too near it for another move', () => {
    const f = chat(caption.end + 1); // the chat case: the video ends 1 s after the caption
    for (const t of [caption.end + 0.1, caption.end + 0.9]) expect(f.target(t)).toEqual(f.target(5));
  });

  it('zooms back in after the caption when the shot goes on long enough', () => {
    const f = chat(caption.end + studio.lead + REHOLD + 1);
    expect(f.target(caption.end + 0.5)[2]).toBeGreaterThan(1);
  });
});
