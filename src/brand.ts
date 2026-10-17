/** The product name, read from package.json: the one place it is set. A rename is
 *  `node scripts/rename.mjs <new-name> "<Display Name>"`, which edits package.json and the docs. */
import { createRequire } from 'node:module';

interface Manifest {
  name: string;
  version: string;
  displayName: string;
}

const manifest = createRequire(import.meta.url)('../package.json') as Manifest;

/** The npm package and command name, e.g. "reelcam". */
export const NAME: string = manifest.name;
/** The name as written in prose and titles. */
export const DISPLAY_NAME: string = manifest.displayName;
export const VERSION: string = manifest.version;
/** The environment variable prefix, e.g. REELCAM_. */
export const ENV_PREFIX = `${NAME.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_`;
