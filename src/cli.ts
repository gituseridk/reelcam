#!/usr/bin/env node
/** The command line: `showreel render script.yml`, `showreel check`, `showreel presets`, `showreel init`. */
import { parseArgs } from 'node:util';
import { ShowreelError, describe } from './errors.js';
import { log, setLevel } from './log.js';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { commands, EXIT, USAGE } from './commands.js';

function parse(argv: string[]): ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true; strict: true }>> {
  return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
}

const OPTIONS = {
  out: { type: 'string', short: 'o' },
  preset: { type: 'string', short: 'p' },
  gif: { type: 'boolean' },
  'no-sheet': { type: 'boolean' },
  'no-check': { type: 'boolean' },
  'allow-remote': { type: 'boolean' },
  keep: { type: 'string' },
  force: { type: 'boolean' },
  verbose: { type: 'boolean', short: 'v' },
  quiet: { type: 'boolean', short: 'q' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean' },
} as const;

export type Parsed = ReturnType<typeof parse>;

export async function main(argv: string[], print: (text: string) => void): Promise<number> {
  let parsed: Parsed;
  try {
    parsed = parse(argv);
  } catch (error) {
    log.error(describe(error));
    print(USAGE);
    return EXIT.usage;
  }
  const { values, positionals } = parsed;
  setLevel(values.quiet === true ? 'quiet' : values.verbose === true ? 'debug' : 'info');
  const [name, ...rest] = positionals;
  const command = name === undefined ? undefined : commands[name];
  if (values.help === true || command === undefined) {
    print(USAGE);
    if (name !== undefined && command === undefined && values.help !== true) log.error(`unknown command "${name}"`);
    return name === undefined || values.help === true ? EXIT.ok : EXIT.usage;
  }
  try {
    return await command(rest, values, print);
  } catch (error) {
    if (!(error instanceof ShowreelError)) {
      log.error(error instanceof Error && error.stack !== undefined ? error.stack : describe(error));
      return EXIT.error;
    }
    log.error(error.message);
    if (error.hint !== undefined) log.error(`hint: ${error.hint}`);
    return EXIT.error;
  }
}

function isEntry(): boolean {
  const script = process.argv[1];
  if (script === undefined) return false;
  try {
    return realpathSync(script) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isEntry()) {
  main(process.argv.slice(2), (text) => process.stdout.write(`${text}\n`)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      log.error(describe(error));
      process.exitCode = EXIT.error;
    },
  );
}
