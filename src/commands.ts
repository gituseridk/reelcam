/** The CLI's commands. Each returns an exit code; failures throw UserError. */
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NAME } from './brand.js';
import { UserError } from './errors.js';
import { render } from './index.js';
import { log } from './log.js';
import { PRESETS } from './presets/index.js';
import { loadScript } from './script/load.js';
import { installBrowser, writeDemo } from './setup.js';
import { STARTER } from './starter.js';

export const EXIT = { ok: 0, checkFailed: 1, usage: 2, error: 3 } as const;

export interface Values {
  out?: string;
  preset?: string;
  gif?: boolean;
  'no-sheet'?: boolean;
  'no-check'?: boolean;
  'allow-remote'?: boolean;
  keep?: string;
  force?: boolean;
  demo?: boolean;
  'with-deps'?: boolean;
}

type Command = (args: string[], values: Values, print: (text: string) => void) => Promise<number>;

export const USAGE = `${NAME}: cinematic demo videos of web apps from a YAML script

Usage:
  ${NAME} render <script.yml> [options]   record the script and write an MP4
  ${NAME} check <script.yml>              validate a script without recording
  ${NAME} init [file]                     write a starter script (default: ${NAME}.yml)
  ${NAME} init --demo [dir]               copy a demo app and a script that records it (default: ${NAME}-demo)
  ${NAME} setup [--with-deps]             install Chromium (--with-deps: also system libraries, Linux)
  ${NAME} presets                         list the built-in looks

Options for render:
  -o, --out <file.mp4>   where to write the video (default: out/<script>.mp4)
  -p, --preset <name>    override the script's preset
      --gif              also write a GIF
      --no-sheet         skip the contact sheet (<name>.sheet.png)
      --no-check         exit 0 even when the framing check finds problems
      --allow-remote     allow non-local URLs
      --keep <dir>       keep the raw take (frames and take.json) in <dir>
  -v, --verbose / -q, --quiet

Exit codes: 0 ok, 1 the video was written but failed its checks, 2 usage, 3 error.`;

function one(args: string[], what: string): string {
  const [file, extra] = args;
  if (file === undefined || extra !== undefined) throw new UserError(`expected exactly one ${what}`, `Run "${NAME} --help".`);
  return file;
}

const renderCommand: Command = async (args, values, print) => {
  const result = await render(one(args, 'script file'), {
    output: values.out,
    preset: values.preset,
    gif: values.gif,
    sheet: values['no-sheet'] !== true,
    allowRemote: values['allow-remote'],
    keep: values.keep,
  });
  for (const file of [result.output, result.gif, result.sheet]) if (file !== undefined) print(path.relative(process.cwd(), file) || file);
  if (result.problems.length === 0) {
    log.info(`done: ${result.seconds.toFixed(1)} s, checks passed`);
    return EXIT.ok;
  }
  for (const p of result.problems) log.warn(p);
  return values['no-check'] === true ? EXIT.ok : EXIT.checkFailed;
};

const checkCommand: Command = async (args, _values, print) => {
  const file = one(args, 'script file');
  const { script } = await loadScript(file);
  print(`${file}: ok (${String(script.steps.length)} steps, preset ${script.preset})`);
  return EXIT.ok;
};

const initCommand: Command = async (args, values, print) => {
  if (values.demo === true) {
    print(await writeDemo(args[0] ?? `${NAME}-demo`, values.force === true));
    return EXIT.ok;
  }
  const file = args[0] ?? `${NAME}.yml`;
  const exists = await access(file).then(
    () => true,
    () => false,
  );
  if (exists && values.force !== true) throw new UserError(`${file} already exists`, 'Pass --force to overwrite it.');
  await writeFile(file, STARTER);
  print(file);
  return EXIT.ok;
};

const presetsCommand: Command = (_args, _values, print) => {
  for (const p of PRESETS) print(`${p.name.padEnd(10)} ${p.description}`);
  return Promise.resolve(EXIT.ok);
};

const setupCommand: Command = async (_args, values) => {
  await installBrowser(values['with-deps'] === true);
  return EXIT.ok;
};

export const commands: Partial<Record<string, Command>> = { render: renderCommand, check: checkCommand, init: initCommand, setup: setupCommand, presets: presetsCommand };
