/** The programmatic API: `render("demo.yml")` records the script and writes the MP4. */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NAME } from './brand.js';
import { log } from './log.js';
import { getPreset } from './presets/index.js';
import { record } from './record/record.js';
import { renderTake, type RenderResult } from './render/render.js';
import { loadScript } from './script/load.js';

export { UserError } from './errors.js';
export { DISPLAY_NAME, NAME, VERSION } from './brand.js';
export { PRESETS, getPreset, type Preset } from './presets/index.js';
export { loadScript, validate } from './script/load.js';
export type { Script } from './script/schema.js';
export type { Step } from './script/steps.js';
export type { RenderResult } from './render/render.js';

export interface RenderOptions {
  /** The MP4 to write (default: the script's `output`, else out/<script name>.mp4). */
  output?: string | undefined;
  /** A preset name that overrides the script's. */
  preset?: string | undefined;
  /** Also write a GIF next to the MP4. */
  gif?: boolean | undefined;
  /** Write the contact sheet (<name>.sheet.png). Default true. */
  sheet?: boolean | undefined;
  /** Allow non-local URLs. */
  allowRemote?: boolean | undefined;
  /** Keep the raw take (frames, take.json) in this folder instead of a temporary one. */
  keep?: string | undefined;
}

export async function render(file: string, options: RenderOptions = {}): Promise<RenderResult> {
  const loaded = await loadScript(file, { output: options.output, allowRemote: options.allowRemote });
  const preset = getPreset(options.preset ?? loaded.script.preset);
  const dir = options.keep === undefined ? await mkdtemp(path.join(os.tmpdir(), `${NAME}-`)) : path.resolve(options.keep);
  try {
    const take = await record(loaded, preset, dir);
    return await renderTake(take, dir, preset, { output: loaded.output, gif: options.gif ?? loaded.script.gif, sheet: options.sheet ?? true, neighbours: loaded.script.checks.neighbours });
  } finally {
    if (options.keep === undefined) {
      await rm(dir, { recursive: true, force: true }).catch((error: unknown) => {
        log.warn(`could not remove ${dir}: ${String(error)}`);
      });
    }
  }
}
