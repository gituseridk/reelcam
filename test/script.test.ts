import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ShowreelError } from '../src/errors.js';
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
      { kind: 'click', on: '#a' },
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
    const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-test-'));
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

  it('reports a missing file and bad YAML as ShowreelError', async () => {
    await expect(loadScript('/no/such/file.yml')).rejects.toThrow(ShowreelError);
    await expect(loadScript(await write('steps: [wide\n'))).rejects.toThrow(/not valid YAML/);
  });
});
