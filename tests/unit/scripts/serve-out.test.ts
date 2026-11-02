import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOST, PORT, startServer } from '../../../scripts/e2e/serve-out.ts';

let root: string;
let server: http.Server;
let port: number;

function write(relative: string, content: string): void {
  const file = path.join(root, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function get(rawPath: string): Promise<{ status: number; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port, path: rawPath, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, type: res.headers['content-type'] ?? '', body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-out-'));
  write('index.html', '<html>inicio</html>');
  write('_next/static/a.js', 'console.log(1)');
  write('_next/static/a.css', 'body{}');
  write('manifest.webmanifest', '{}');
  write('icon.svg', '<svg/>');
  write('icons/icon-192.png', 'png');
  write('dados.json', '{"a":1}');
  fs.writeFileSync(path.join(os.tmpdir(), 'serve-out-segredo.txt'), 'segredo');
  server = await startServer({ root, port: 0 });
  port = (server.address() as AddressInfo).port;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(root, { recursive: true, force: true });
});

describe('serve-out (contracts/e2e.md › Execução)', () => {
  it('usa a porta 4310 e o host 127.0.0.1 por padrão', () => {
    expect(PORT).toBe(4310);
    expect(HOST).toBe('127.0.0.1');
  });

  it('escuta só em 127.0.0.1', () => {
    expect((server.address() as AddressInfo).address).toBe('127.0.0.1');
  });

  it('"/" devolve out/index.html', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html; charset=utf-8');
    expect(res.body).toBe('<html>inicio</html>');
  });

  it.each([
    ['/index.html', 'text/html; charset=utf-8'],
    ['/_next/static/a.js', 'text/javascript; charset=utf-8'],
    ['/_next/static/a.css', 'text/css; charset=utf-8'],
    ['/manifest.webmanifest', 'application/manifest+json'],
    ['/icon.svg', 'image/svg+xml'],
    ['/icons/icon-192.png', 'image/png'],
    ['/dados.json', 'application/json; charset=utf-8'],
  ])('%s tem o tipo %s', async (url, type) => {
    const res = await get(url);
    expect(res.status).toBe(200);
    expect(res.type).toBe(type);
  });

  it('ignora a query string', async () => {
    const res = await get('/icon.svg?v=1');
    expect(res.status).toBe(200);
    expect(res.body).toBe('<svg/>');
  });

  it('responde 404 para arquivo ausente e para diretório', async () => {
    expect((await get('/nao-existe.js')).status).toBe(404);
    expect((await get('/_next')).status).toBe(404);
  });

  it('recusa caminho com ".."', async () => {
    const plain = await get('/../serve-out-segredo.txt');
    const encoded = await get('/%2e%2e/serve-out-segredo.txt');
    for (const res of [plain, encoded]) {
      expect(res.status).toBe(404);
      expect(res.body).not.toContain('segredo');
    }
  });
});
