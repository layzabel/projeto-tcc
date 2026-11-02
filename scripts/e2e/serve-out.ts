import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export const HOST = '127.0.0.1';
export const PORT = 4310;

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export type ServeOptions = { root: string; port?: number };

// Devolve o arquivo dentro de root, ou null para qualquer caminho fora dele, ausente ou que não
// seja arquivo.
export function resolveFile(root: string, url: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (url.includes('..') || pathname.includes('..')) {
    return null;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const base = path.resolve(root);
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep)) {
    return null;
  }
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function handle(root: string, req: http.IncomingMessage, res: http.ServerResponse): void {
  const file = resolveFile(root, req.url ?? '/');
  if (file === null) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('não encontrado');
    return;
  }
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(file).pipe(res);
}

export function startServer({ root, port = PORT }: ServeOptions): Promise<http.Server> {
  const server = http.createServer((req, res) => handle(root, req, res));
  return new Promise((resolve) => {
    server.listen(port, HOST, () => resolve(server));
  });
}

if (import.meta.main) {
  const server = await startServer({ root: path.join(process.cwd(), 'out') });
  console.log(`servindo out/ em http://${HOST}:${PORT}`);
  process.on('SIGTERM', () => server.close());
}
