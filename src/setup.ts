/** `setup` installs the Chromium build that our own Playwright expects, and
 *  `init --demo` copies the bundled demo app with a script that records it. */
import { spawn } from 'node:child_process';
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError, describe } from './errors.js';
import { NAME } from './brand.js';
import { log } from './log.js';

/** The package root (where examples/ lives), from dist/ or src/. */
export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function playwrightCli(): string {
  try {
    const manifest = createRequire(import.meta.url).resolve('playwright/package.json');
    return path.join(path.dirname(manifest), 'cli.js');
  } catch (error) {
    throw new UserError(`cannot find Playwright: ${describe(error)}`, `Reinstall ${NAME}.`, { cause: error });
  }
}

/** Runs `playwright install chromium` (with `--with-deps` for system libraries on Linux). */
export async function installBrowser(withDeps: boolean): Promise<void> {
  const args = [playwrightCli(), 'install', ...(withDeps ? ['--with-deps'] : []), 'chromium'];
  log.info(`installing Chromium for Playwright${withDeps ? ' with system dependencies' : ''}`);
  const code = await new Promise<number | null>((resolve, reject) => {
    const proc = spawn(process.execPath, args, { stdio: 'inherit' });
    proc.once('error', reject);
    proc.once('close', resolve);
  });
  if (code !== 0) throw new UserError(`playwright install failed (exit ${String(code)})`, withDeps ? 'System dependencies need root: try with sudo.' : undefined);
}

async function exists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}

/** Copies the demo app into `dir`/app and writes `dir`/demo.yml. Returns the script path. */
export async function writeDemo(dir: string, force: boolean): Promise<string> {
  const script = path.join(dir, 'demo.yml');
  if ((await exists(script)) && !force) throw new UserError(`${script} already exists`, 'Pass --force to overwrite it.');
  await mkdir(dir, { recursive: true });
  await cp(path.join(PACKAGE_ROOT, 'examples', 'orbit'), path.join(dir, 'orbit'), { recursive: true });
  const hero = await readFile(path.join(PACKAGE_ROOT, 'examples', 'hero.yml'), 'utf8');
  await writeFile(script, hero);
  return script;
}
