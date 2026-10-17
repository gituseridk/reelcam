import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NAME } from '../src/brand.js';
import { main } from '../src/cli.js';
import { setSink } from '../src/log.js';

let printed: string[];
let logged: string[];
let restore: () => void;

beforeEach(() => {
  printed = [];
  logged = [];
  restore = setSink((line) => logged.push(line));
});

afterEach(() => {
  restore();
});

const run = (...argv: string[]): Promise<number> => main(argv, (text) => printed.push(text));

describe('cli', () => {
  it('prints usage with no command and with --help', async () => {
    expect(await run()).toBe(0);
    expect(printed.join('\n')).toContain(`${NAME} render <script.yml>`);
    expect(await run('render', '--help')).toBe(0);
  });

  it('exits 2 on an unknown command or option', async () => {
    expect(await run('dance')).toBe(2);
    expect(logged.join('\n')).toContain('unknown command "dance"');
    expect(await run('render', '--nope')).toBe(2);
  });

  it('lists presets', async () => {
    expect(await run('presets')).toBe(0);
    expect(printed.join('\n')).toMatch(/^studio /m);
  });

  it('init writes a starter that passes check, and refuses to overwrite', async () => {
    const file = path.join(await mkdtemp(path.join(os.tmpdir(), 'showreel-cli-')), 'showreel.yml');
    expect(await run('init', file)).toBe(0);
    expect(await readFile(file, 'utf8')).toContain('steps:');
    expect(await run('check', file)).toBe(0);
    expect(await run('init', file)).toBe(3);
    expect(logged.join('\n')).toContain('--force');
    expect(await run('init', file, '--force')).toBe(0);
  });

  it('check reports every problem with its path and exits 3', async () => {
    const file = path.join(await mkdtemp(path.join(os.tmpdir(), 'showreel-cli-')), 'bad.yml');
    await writeFile(file, 'url: http://localhost:1\nsteps:\n  - clik: "#a"\n  - wait: -5\n');
    expect(await run('check', file)).toBe(3);
    const text = logged.join('\n');
    expect(text).toContain('steps[0]: unknown step "clik"');
    expect(text).toContain('steps[1].wait');
  });

  it('render needs exactly one script', async () => {
    expect(await run('render')).toBe(3);
    expect(await run('render', 'a.yml', 'b.yml')).toBe(3);
  });
});

describe('cli demo and setup', () => {
  it('init --demo copies the app and a script that passes check', async () => {
    const target = path.join(await mkdtemp(path.join(os.tmpdir(), 'showreel-demo-')), 'demo');
    expect(await run('init', '--demo', target)).toBe(0);
    expect(await readFile(path.join(target, 'orbit', 'index.html'), 'utf8')).toContain('Orbit');
    expect(await run('check', path.join(target, 'demo.yml'))).toBe(0);
    expect(await run('init', '--demo', target)).toBe(3);
  });

  it('finds the bundled Playwright CLI for setup', async () => {
    const { playwrightCli } = await import('../src/setup.js');
    expect((await readFile(playwrightCli(), 'utf8')).length).toBeGreaterThan(0);
  });
});
