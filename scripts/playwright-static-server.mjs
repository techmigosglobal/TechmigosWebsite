import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = 4321;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function candidatePaths(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0] || '/');
  const relative = normalize(decoded).replace(/^([.]{2}[\\/])+/, '');
  const path = join(root, relative);
  return decoded.endsWith('/')
    ? [join(path, 'index.html')]
    : [path, join(path, 'index.html')];
}

async function resolveFile(requestPath) {
  for (const candidate of candidatePaths(requestPath)) {
    const absolute = resolve(candidate);
    if (absolute !== root && !absolute.startsWith(`${root}/`)) continue;
    try {
      const info = await fs.stat(absolute);
      if (info.isFile()) return absolute;
    } catch {
      // Try the next static candidate.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end();
    return;
  }
  try {
    const file = await resolveFile(request.url || '/');
    if (!file) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': mimeTypes[extname(file)] || 'application/octet-stream' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Internal server error');
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.listen(port, '127.0.0.1');
