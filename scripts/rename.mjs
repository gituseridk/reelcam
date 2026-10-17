#!/usr/bin/env node
// Renames the project everywhere in one step: package.json (name, displayName, bin), docs,
// examples, the action and the skill. Code reads the name from package.json, so it needs no edit.
// Usage: node scripts/rename.mjs <new-name> "<Display Name>"   (run from the repository root)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [name, display] = process.argv.slice(2);
if (!name || !display || !/^[a-z][a-z0-9-]*$/.test(name)) {
  process.stderr.write('usage: node scripts/rename.mjs <new-name> "<Display Name>" (name: lowercase, digits, dashes)\n');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const old = manifest.name;
const oldDisplay = manifest.displayName;
const upper = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '_');
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter((f) => f !== '' && f !== 'LICENSE');
let changed = 0;
for (const file of files) {
  const raw = readFileSync(file);
  if (raw.includes(0)) continue; // binary (video, image)
  const text = raw.toString('utf8');
  const next = text.replaceAll(oldDisplay, display).replaceAll(old, name).replaceAll(upper(old), upper(name));
  if (next !== text) {
    writeFileSync(file, next);
    changed += 1;
  }
}
process.stdout.write(`renamed ${old} -> ${name} ("${oldDisplay}" -> "${display}") in ${changed} files\n`);
