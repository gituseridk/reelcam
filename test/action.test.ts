/** The GitHub Action: its metadata is consistent and safe, and its render step works as CI runs it. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';

interface Step {
  run?: string;
  uses?: string;
  env?: Record<string, string>;
}
interface Action {
  inputs: Record<string, { required: boolean; default?: string }>;
  runs: { using: string; steps: Step[] };
}

let action: Action;
let text: string;

beforeAll(async () => {
  text = await readFile('action.yml', 'utf8');
  action = parse(text) as Action;
  execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json']);
});

describe('action.yml', () => {
  it('is a composite action whose every referenced input is declared', () => {
    expect(action.runs.using).toBe('composite');
    const used = [...text.matchAll(/inputs\.([a-z-]+)/g)].map((m) => m[1]);
    for (const name of used) expect(Object.keys(action.inputs)).toContain(name);
    expect(action.inputs.script?.required).toBe(true);
  });

  it('never interpolates inputs into shell code (script injection)', () => {
    for (const step of action.runs.steps) expect(step.run ?? '').not.toMatch(/\$\{\{\s*inputs\./);
  });

  it('pins every external action to a major version', () => {
    for (const step of action.runs.steps) if (step.uses !== undefined) expect(step.uses).toMatch(/^[\w-]+\/[\w-]+@v\d+$/);
  });
});

describe('action/render.sh', () => {
  it('renders the script and writes the step outputs', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-action-'));
    const outputs = path.join(dir, 'outputs.txt');
    const env = { ...process.env, GITHUB_ACTION_PATH: process.cwd(), GITHUB_OUTPUT: outputs, RENDER_SCRIPT: 'examples/quickstart.yml', RENDER_OUTPUT: path.join(dir, 'q.mp4') };
    const res = spawnSync('bash', ['action/render.sh'], { env, encoding: 'utf8' });
    expect(res.status, res.stderr).toBe(0);
    const out = await readFile(outputs, 'utf8');
    expect(out).toContain(`video=${path.relative(process.cwd(), path.join(dir, 'q.mp4'))}`);
    expect(out).toMatch(/sheet=.*q\.sheet\.png/);
    expect(out).toContain('status=0');
  });

  it('fails without a script', () => {
    const res = spawnSync('bash', ['action/render.sh'], { env: { ...process.env, GITHUB_ACTION_PATH: process.cwd(), RENDER_SCRIPT: '' }, encoding: 'utf8' });
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('script');
  });
});
