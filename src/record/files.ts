/** Writes a take to its work folder: frames/NNNNN.jpg, sprites/*.png and take.json. */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Take } from '../take.js';
import type { Frame } from './screencast.js';

export async function freshDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(path.join(dir, 'frames'), { recursive: true });
  await mkdir(path.join(dir, 'sprites'), { recursive: true });
}

/** The screencast only sends a frame when the page changes, so a still final hold has no frame at
 *  its end: the last frame is repeated at the real end time. */
export function closeFrames(frames: Frame[], end: number): Frame[] {
  const last = frames.at(-1);
  if (last === undefined || last.t >= end) return frames;
  return [...frames, { data: last.data, t: end }];
}

export async function writeFrames(dir: string, frames: readonly Frame[]): Promise<void> {
  await Promise.all(frames.map((f, i) => writeFile(path.join(dir, 'frames', `${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'))));
}

export const framePath = (dir: string, i: number): string => path.join(dir, 'frames', `${String(i).padStart(5, '0')}.jpg`);

export async function writeTake(dir: string, take: Take): Promise<void> {
  await writeFile(path.join(dir, 'take.json'), JSON.stringify(take));
}
