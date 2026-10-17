import { mkdtemp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ShowreelError } from '../src/errors.js';
import { getPreset } from '../src/presets/index.js';
import { Encoder, gifArgs, mp4Args, runFfmpeg } from '../src/render/encode.js';

const tiny = { ...getPreset('studio'), width: 64, height: 36 };

afterEach(() => {
  delete process.env.SHOWREEL_FFMPEG;
});

describe('ffmpeg arguments', () => {
  it('encodes raw RGBA from stdin to a fast-start H.264 MP4', () => {
    const args = mp4Args(getPreset('studio'), 'out.mp4');
    expect(args).toEqual(expect.arrayContaining(['rawvideo', 'rgba', '1920x1080', 'libx264', 'yuv420p', '+faststart']));
    expect(args.at(-1)).toBe('out.mp4');
  });

  it('builds a palette GIF at the given width', () => {
    expect(gifArgs('a.mp4', 'a.gif', 960).join(' ')).toContain('scale=960:-2');
  });
});

describe('Encoder', () => {
  it('writes a playable MP4', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-enc-'));
    const out = path.join(dir, 'a.mp4');
    const enc = new Encoder(tiny, out);
    const frame = Buffer.alloc(64 * 36 * 4, 200);
    for (let i = 0; i < 10; i++) await enc.write(frame);
    await enc.finish();
    expect((await stat(out)).size).toBeGreaterThan(100);
  });

  it('turns a missing ffmpeg into a ShowreelError with an install hint', async () => {
    process.env.SHOWREEL_FFMPEG = '/no/such/ffmpeg';
    await expect(runFfmpeg(['-version'])).rejects.toThrow(ShowreelError);
    const enc = new Encoder(tiny, path.join(os.tmpdir(), 'showreel-never.mp4'));
    await expect(enc.finish()).rejects.toThrow(/cannot run ffmpeg/);
  });

  it('reports ffmpeg failures with its stderr', async () => {
    await expect(runFfmpeg(['-i', '/no/such/input.mp4', path.join(os.tmpdir(), 'showreel-never.gif')])).rejects.toThrow(/ffmpeg failed/);
  });
});
