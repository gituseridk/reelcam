import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { UserError } from '../src/errors.js';
import { isLocalUrl, loadScript, validate } from '../src/script/load.js';

const base = { url: 'http://localhost:3000' };

describe('validate', () => {
  it('fills defaults', () => {
    const s = validate({ ...base, steps: ['wide'] }, 't');
    expect(s.viewport).toEqual({ width: 1440, height: 810 });
    expect(s.scale).toBe(2);
    expect(s.preset).toBe('studio');
    expect(s.steps).toEqual([{ kind: 'wide', why: '' }]);
  });

  it('normalises every short form', () => {
    const s = validate(
      {
        ...base,
        steps: [{ click: '#a' }, { focus: '#b' }, { scroll: 300 }, { caption: 'Hi' }, { zoom: { on: '#c', level: 2 } }, { wide: null }, { type: { text: 'x' } }],
      },
      't',
    );
    expect(s.steps).toEqual([
      { kind: 'click', at: '#a', on: undefined },
      { kind: 'focus', on: '#b', why: '', zoom: undefined },
      { kind: 'scroll', by: 300, to: undefined, ms: 900 },
      { kind: 'caption', text: 'Hi', ms: 2000 },
      { kind: 'focus', on: '#c', why: '', zoom: 2 },
      { kind: 'wide', why: '' },
      { kind: 'type', into: undefined, text: 'x', delay: 45 },
    ]);
  });

  it.each([
    [{ ...base, steps: [{ clik: '#a' }] }, 'steps[0]: unknown step "clik"'],
    [{ ...base, steps: [{ click: '#a', wait: 1 }] }, 'steps[0]: a step has exactly one key, got 2'],
    [{ ...base, steps: [{ wait: -1 }] }, 'steps[0].wait'],
    [{ ...base, steps: [{ type: { into: '#a' } }] }, 'steps[0].type.text'],
    [{ ...base, steps: [] }, 'at least one step'],
    [{ steps: ['wide'] }, 'give "url"'],
    [{ ...base, steps: ['wide'], colour: 'x' }, 'colour'],
    [{ ...base, steps: [42] }, 'one-key map'],
  ])('rejects %j', (data, message) => {
    expect(() => validate(data, 't')).toThrow(message);
  });

  it('refuses remote URLs unless allowed', () => {
    expect(() => validate({ url: 'https://example.com', steps: ['wide'] }, 't')).toThrow(/non-local URL/);
    expect(() => validate({ ...base, steps: [{ visit: 'https://example.com/x' }] }, 't')).toThrow(/non-local URL/);
    expect(validate({ url: 'https://example.com', allowRemote: true, steps: ['wide'] }, 't').allowRemote).toBe(true);
    expect(validate({ ...base, steps: [{ visit: '/settings' }] }, 't').steps).toHaveLength(1);
  });
});

describe('isLocalUrl', () => {
  it.each([
    ['http://localhost:3000/', true],
    ['http://app.localhost/', true],
    ['http://127.0.0.1:8080', true],
    ['http://127.10.0.3', true],
    ['http://[::1]:5173/', true],
    ['https://example.com', false],
    ['http://localhost.example.com', false],
    ['http://128.0.0.1', false],
    ['file:///etc/passwd', false],
    ['not a url', false],
  ])('%s -> %s', (url, local) => {
    expect(isLocalUrl(url)).toBe(local);
  });
});

describe('loadScript', () => {
  async function write(text: string): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'reelcam-test-'));
    const file = path.join(dir, 'demo.yml');
    await writeFile(file, text);
    return file;
  }

  it('resolves serve and output next to the script', async () => {
    const file = await write('serve: app\noutput: videos/a.mp4\nsteps: [wide]\n');
    const loaded = await loadScript(file);
    expect(loaded.serveDir).toBe(path.join(path.dirname(file), 'app'));
    expect(loaded.output).toBe(path.join(path.dirname(file), 'videos/a.mp4'));
  });

  it('defaults the output to out/<name>.mp4 under the working folder', async () => {
    const loaded = await loadScript(await write('url: http://localhost:1\nsteps: [wide]\n'));
    expect(loaded.output).toBe(path.resolve('out', 'demo.mp4'));
  });

  it('lets --allow-remote override the script', async () => {
    const loaded = await loadScript(await write('url: https://example.com\nsteps: [wide]\n'), { allowRemote: true });
    expect(loaded.script.allowRemote).toBe(true);
  });

  it('reports a missing file and bad YAML as UserError', async () => {
    await expect(loadScript('/no/such/file.yml')).rejects.toThrow(UserError);
    await expect(loadScript(await write('steps: [wide\n'))).rejects.toThrow(/not valid YAML/);
  });
});

describe('canvas steps and setup', () => {
  it('parses drag, click at a point and an area focus', () => {
    const s = validate(
      {
        ...base,
        steps: [
          { drag: { from: [0.1, 0.2], to: '#target', on: 'canvas' } },
          { click: { at: [0.5, 0.5] } },
          { focus: { area: [0.1, 0.2, 0.9, 0.8], why: 'drawing' } },
        ],
      },
      't',
    );
    expect(s.steps).toEqual([
      { kind: 'drag', from: [0.1, 0.2], to: '#target', on: 'canvas', ms: 700 },
      { kind: 'click', at: [0.5, 0.5], on: undefined },
      { kind: 'focus', on: { area: [0.1, 0.2, 0.9, 0.8] }, why: 'drawing', zoom: undefined },
    ]);
  });

  it.each([
    [{ focus: { area: [0.5, 0.2, 0.4, 0.8] } }, 'right > left'],
    [{ focus: { on: '#a', area: [0, 0, 1, 1] } }, 'exactly one of'],
    [{ focus: {} }, 'exactly one of'],
    [{ drag: { from: [1.5, 0], to: [0, 0] } }, 'steps[0].drag.from'],
  ])('rejects %j', (step, message) => {
    expect(() => validate({ ...base, steps: [step] }, 't')).toThrow(message);
  });

  it('parses hover at a point and the neighbour check switch', () => {
    const s = validate({ ...base, checks: { neighbours: false }, steps: [{ hover: { at: [0.2, 0.3] } }, { hover: '#menu' }] }, 't');
    expect(s.checks.neighbours).toBe(false);
    expect(s.steps).toEqual([
      { kind: 'hover', at: [0.2, 0.3], on: undefined },
      { kind: 'hover', at: '#menu', on: undefined },
    ]);
    expect(validate({ ...base, steps: ['wide'] }, 't').checks.neighbours).toBe(true);
  });

  it('plays setup steps off camera, and keeps camera steps out of setup', () => {
    expect(validate({ ...base, setup: [{ click: '#cookies' }], steps: ['wide'] }, 't').setup).toHaveLength(1);
    expect(() => validate({ ...base, setup: [{ caption: 'x' }], steps: ['wide'] }, 't')).toThrow(/setup steps are not filmed/);
  });
});
