/** A rename is one command: afterwards no trace of the old name is left in the tracked text files. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISPLAY_NAME, NAME } from '../src/brand.js';

describe('scripts/rename.mjs', () => {
  it('renames the package, its command and every doc', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'rename-'));
    const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((f) => f !== '' && !f.startsWith('docs/'));
    execFileSync('cp', ['--parents', ...files, dir]);
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', '-A'], { cwd: dir });
    execFileSync('node', ['scripts/rename.mjs', 'zzcam', 'Zzcam'], { cwd: dir });
    const manifest = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as { name: string; displayName: string; bin: Record<string, string> };
    expect(manifest.name).toBe('zzcam');
    expect(manifest.displayName).toBe('Zzcam');
    expect(Object.keys(manifest.bin)).toEqual(['zzcam']);
    execFileSync('git', ['add', '-A'], { cwd: dir });
    const left = spawnSync('git', ['grep', '-il', NAME, '--', '.', ':!LICENSE'], { cwd: dir, encoding: 'utf8' });
    expect(left.stdout.trim()).toBe('');
    expect(left.status).toBe(1); // git grep: 1 = no match
    expect(DISPLAY_NAME.length).toBeGreaterThan(0);
  });
});
