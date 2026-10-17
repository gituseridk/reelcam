/** Reads a script file: YAML parse, schema check, local-only URL guard, paths made absolute. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import { UserError, describe } from '../errors.js';
import { scriptSchema, type Script } from './schema.js';

export interface LoadedScript {
  script: Script;
  /** The script's own path, absolute. */
  file: string;
  /** The folder to serve, absolute, when the script has `serve`. */
  serveDir: string | undefined;
  /** The MP4 to write, absolute. */
  output: string;
}

/** "steps[2].click: expected string" for each issue, one per line. */
export function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => {
      const where = issue.path.reduce<string>((acc, key) => (typeof key === 'number' ? `${acc}[${String(key)}]` : acc === '' ? String(key) : `${acc}.${String(key)}`), '');
      return where === '' ? issue.message : `${where}: ${issue.message}`;
    })
    .join('\n');
}

/** True for http(s) URLs on this machine: localhost, *.localhost, 127.0.0.0/8, ::1. */
export function isLocalUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname;
  return host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || /^127(\.\d{1,3}){3}$/.test(host);
}

/** Validates already-parsed YAML data. Throws UserError listing every problem. */
export function validate(data: unknown, label: string): Script {
  const result = scriptSchema.safeParse(data);
  if (!result.success) throw new UserError(`${label} is not a valid script:\n${formatIssues(result.error.issues)}`, 'See "Script format" in the README.');
  const script = result.data;
  const remote = [script.url, ...script.steps.flatMap((s) => (s.kind === 'visit' ? [s.url] : []))].filter(
    (u): u is string => u !== undefined && /^[a-z]+:/i.test(u) && !isLocalUrl(u),
  );
  const first = remote[0];
  if (first !== undefined && !script.allowRemote) {
    throw new UserError(`${label} opens a non-local URL: ${first}`, 'Only local apps are recorded by default. Set "allowRemote: true" in the script (or pass --allow-remote) if you mean it.');
  }
  return script;
}

export async function loadScript(file: string, options: { output?: string | undefined; allowRemote?: boolean | undefined } = {}): Promise<LoadedScript> {
  const abs = path.resolve(file);
  let text: string;
  try {
    text = await readFile(abs, 'utf8');
  } catch (error) {
    throw new UserError(`cannot read the script ${file}: ${describe(error)}`, 'Check the path.', { cause: error });
  }
  let data: unknown;
  try {
    data = parse(text, { prettyErrors: true });
  } catch (error) {
    throw new UserError(`${file} is not valid YAML: ${describe(error)}`, undefined, { cause: error });
  }
  if (options.allowRemote === true && typeof data === 'object' && data !== null) Object.assign(data, { allowRemote: true });
  const script = validate(data, file);
  const dir = path.dirname(abs);
  const name = path.basename(abs).replace(/\.(ya?ml)$/i, '');
  const output = options.output ?? (script.output === undefined ? path.resolve('out', `${name}.mp4`) : path.resolve(dir, script.output));
  return { script, file: abs, serveDir: script.serve === undefined ? undefined : path.resolve(dir, script.serve), output: path.resolve(output) };
}
