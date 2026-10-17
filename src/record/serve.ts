/** A tiny static file server for `serve:` scripts, bound to 127.0.0.1 on a free port. It serves
 *  only files inside its folder (no traversal, no symlinks out) and lists nothing. */
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { ShowreelError, describe } from '../errors.js';
import { log } from '../log.js';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

export interface Served {
  origin: string;
  close: () => Promise<void>;
}

/** The file a request maps to, or null when it falls outside `root`. */
export async function resolveFile(root: string, urlPath: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  const wanted = path.join(root, path.normalize(decoded));
  try {
    const info = await stat(wanted);
    const file = info.isDirectory() ? path.join(wanted, 'index.html') : wanted;
    const real = await realpath(file);
    return real === root || real.startsWith(root + path.sep) ? real : null;
  } catch {
    return null;
  }
}

async function handle(root: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const file = req.method === 'GET' || req.method === 'HEAD' ? await resolveFile(root, req.url ?? '/') : null;
  if (file === null) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file)
    .on('error', (error) => {
      log.warn(`serve: ${describe(error)}`);
      res.destroy(error);
    })
    .pipe(res);
}

export async function serveFolder(dir: string): Promise<Served> {
  let root: string;
  try {
    root = await realpath(dir);
  } catch (error) {
    throw new ShowreelError(`cannot serve ${dir}: ${describe(error)}`, 'The "serve" path is relative to the script file.', { cause: error });
  }
  const server = createServer((req, res) => {
    handle(root, req, res).catch((error: unknown) => {
      log.warn(`serve: ${describe(error)}`);
      if (!res.headersSent) res.writeHead(500).end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  log.debug(`serving ${root} on http://127.0.0.1:${String(port)}`);
  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) resolve();
        else reject(error);
      });
    });
  return { origin: `http://127.0.0.1:${String(port)}`, close };
}
