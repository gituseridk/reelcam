/** The package version, read from package.json (one level above src/ and dist/). */
import { createRequire } from 'node:module';
import { z } from 'zod';

export function packageVersion(): string {
  const manifest: unknown = createRequire(import.meta.url)('../package.json');
  return z.object({ version: z.string() }).parse(manifest).version;
}
