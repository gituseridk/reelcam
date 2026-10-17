/** End to end: real Chromium, real ffmpeg, the demo app from examples/pebble. */
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { beforeAll, describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import { render } from '../src/index.js';
import { setLevel } from '../src/log.js';

const APP = path.resolve('examples/pebble');
let dir: string;

beforeAll(async () => {
  setLevel('quiet');
  dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-e2e-'));
});

async function script(name: string, body: string, viewport = '{ width: 1280, height: 720 }'): Promise<string> {
  const file = path.join(dir, `${name}.yml`);
  await writeFile(file, `serve: ${APP}\nviewport: ${viewport}\n${body}`);
  return file;
}

function probe(file: string): { width: number; height: number; duration: number } {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file]).toString();
  const json = JSON.parse(out) as { streams: { width: number; height: number }[]; format: { duration: string } };
  const s = json.streams[0];
  if (s === undefined) throw new Error('no video stream');
  return { width: s.width, height: s.height, duration: Number(json.format.duration) };
}

/** Sum of horizontal pixel differences over a region of a JPEG: a sharpness measure. */
async function detail(file: string, x: number, y: number, w: number, h: number): Promise<number> {
  const img = await loadImage(file);
  const c = createCanvas(w, h);
  c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
  const px = c.getContext('2d').getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 4; i < px.length; i += 4) sum += Math.abs((px[i] ?? 0) - (px[i - 4] ?? 0));
  return sum;
}

describe('render', () => {
  it('records the demo app into a 1080p MP4 that passes its checks, with a sheet and a GIF', async () => {
    const file = await script('basic', 'title: Hello\nsteps:\n  - focus: "#composer"\n  - type: { into: "#new-task", text: "Hi" }\n  - press: Enter\n  - focus: "#today"\n  - caption: Done\n');
    const result = await render(file, { output: path.join(dir, 'basic.mp4'), gif: true });
    expect(result.problems).toEqual([]);
    expect(probe(result.output)).toMatchObject({ width: 1920, height: 1080 });
    expect(probe(result.output).duration).toBeGreaterThan(3);
    expect((await stat(result.sheet ?? '')).size).toBeGreaterThan(10_000);
    expect((await stat(result.gif ?? '')).size).toBeGreaterThan(10_000);
  });

  it('renders the vertical preset at 1080x1920', async () => {
    const file = await script('tall', 'preset: vertical\nsteps:\n  - click: ".check >> nth=1"\n  - wait: 400\n', '{ width: 390, height: 844 }');
    const result = await render(file, { output: path.join(dir, 'tall.mp4'), sheet: false });
    expect(probe(result.output)).toMatchObject({ width: 1080, height: 1920 });
    expect(result.sheet).toBeUndefined();
  });

  it('fails the check on forbidden text, a flicker shot, and exits 1 from the CLI', async () => {
    const file = await script('noisy', 'forbid: ["flaky"]\nsteps:\n  - focus: "#composer"\n  - wait: 300\n  - wide\n  - wait: 1300\n');
    const code = await main(['render', file, '-o', path.join(dir, 'noisy.mp4'), '-q'], () => undefined);
    expect(code).toBe(1);
    const result = await render(file, { output: path.join(dir, 'noisy.mp4'), sheet: false });
    const text = result.problems.join('\n');
    expect(text).toMatch(/forbidden text \/flaky\//);
    expect(text).toMatch(/held only/);
  });

  it('blurs redacted elements in the recorded frames', async () => {
    const plain = await script('plain', 'steps:\n  - wait: 300\n');
    const hidden = await script('hidden', 'redact: ["#tasks"]\nsteps:\n  - wait: 300\n');
    await render(plain, { output: path.join(dir, 'plain.mp4'), sheet: false, keep: path.join(dir, 'take-plain') });
    await render(hidden, { output: path.join(dir, 'hidden.mp4'), sheet: false, keep: path.join(dir, 'take-hidden') });
    const region = [700, 380, 1200, 300] as const;
    const a = await detail(path.join(dir, 'take-plain', 'frames', '00000.jpg'), ...region);
    const b = await detail(path.join(dir, 'take-hidden', 'frames', '00000.jpg'), ...region);
    expect(b).toBeLessThan(a * 0.5);
  });

  it('films a drag and a point click on an area shot, with off-camera setup', async () => {
    const file = await script('canvas', 'setup:\n  - click: "#new-task"\nsteps:\n  - focus: { area: [0.2, 0.15, 0.8, 0.85] }\n  - drag: { from: [0.3, 0.5], to: [0.6, 0.55], ms: 300 }\n  - click: { at: [0.5, 0.6] }\n  - wait: 500\n');
    const result = await render(file, { output: path.join(dir, 'canvas.mp4'), sheet: false, keep: path.join(dir, 'take-canvas') });
    expect(result.problems).toEqual([]);
    const take = JSON.parse(await readFile(path.join(dir, 'take-canvas', 'take.json'), 'utf8')) as { clicks: unknown[]; times: number[]; shots: { name: string }[] };
    expect(take.clicks).toHaveLength(2); // the setup click is not in the film
    expect(take.shots.map((s) => s.name)).toEqual(['steps[0] focus area']);
  });

  it('names the failing step and gives a hint when a selector never appears', async () => {
    const file = await script('missing', 'steps:\n  - wait: 100\n  - click: "#does-not-exist"\n');
    await expect(render(file, { output: path.join(dir, 'missing.mp4') })).rejects.toThrow(/steps\[1\] click/);
  });
});
