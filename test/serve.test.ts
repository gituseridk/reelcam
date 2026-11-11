import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveFile, serveFolder, type Served } from '../src/record/serve.js';

let root: string;
let served: Served;

beforeAll(async () => {
  const outer = await mkdtemp(path.join(os.tmpdir(), 'reelcam-serve-'));
  root = path.join(outer, 'site');
  await mkdir(path.join(root, 'sub'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<h1>home</h1>');
  await writeFile(path.join(root, 'sub', 'a.css'), 'body{}');
  await writeFile(path.join(outer, 'secret.txt'), 'outside');
  await symlink(path.join(outer, 'secret.txt'), path.join(root, 'link.txt'));
  served = await serveFolder(root);
});

afterAll(async () => {
  await served.close();
});

describe('serveFolder', () => {
  it('binds to 127.0.0.1 and serves index.html with a content type', async () => {
    expect(served.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const res = await fetch(`${served.origin}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('<h1>home</h1>');
    expect((await fetch(`${served.origin}/sub/a.css`)).headers.get('content-type')).toContain('text/css');
  });

  it('answers 404 for missing files, traversal and symlinks out of the folder', async () => {
    expect((await fetch(`${served.origin}/nope.html`)).status).toBe(404);
    expect((await fetch(`${served.origin}/%2e%2e/secret.txt`)).status).toBe(404);
    expect((await fetch(`${served.origin}/link.txt`)).status).toBe(404);
    expect((await fetch(`${served.origin}/`, { method: 'POST' })).status).toBe(404);
  });

  it('resolveFile keeps every path inside the root', async () => {
    const real = await resolveFile(root, '/');
    expect(real?.endsWith('index.html')).toBe(true);
    expect(await resolveFile(root, '/../secret.txt')).toBeNull();
    expect(await resolveFile(root, '/%E0%A4%A')).toBeNull();
  });

  it('fails clearly on a missing folder', async () => {
    await expect(serveFolder('/no/such/folder')).rejects.toThrow(/cannot serve/);
  });
});
