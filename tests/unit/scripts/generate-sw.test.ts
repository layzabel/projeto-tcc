import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildServiceWorker,
  computeVersion,
  generateServiceWorker,
  listOutputFiles,
} from '../../../scripts/pwa/generate-sw.ts';

const SW_SOURCE = fs.readFileSync(path.resolve('src/pwa/sw.ts'), 'utf8');

let root: string;
let outDir: string;

function write(relative: string, content: string): void {
  const file = path.join(outDir, ...relative.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'));
  outDir = path.join(root, 'out');
  write('index.html', '<html>inicio</html>');
  write('404.html', '<html>404</html>');
  write('_next/static/chunks/a.js', 'console.log(1)');
  write('manifest.webmanifest', '{}');
  write('icon.svg', '<svg/>');
  write('sw.js', '// antigo');
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('listOutputFiles', () => {
  it('lista 100% dos arquivos de out/ exceto sw.js, mais "/" (SC-009)', () => {
    const urls = listOutputFiles(outDir);
    expect(new Set(urls)).toEqual(
      new Set([
        '/',
        '/index.html',
        '/404.html',
        '/_next/static/chunks/a.js',
        '/manifest.webmanifest',
        '/icon.svg',
      ]),
    );
    expect(urls).toHaveLength(6);
    expect(urls.every((url) => !url.includes('\\'))).toBe(true);
  });

  it('falha quando out/ não existe', () => {
    expect(() => listOutputFiles(path.join(root, 'inexistente'))).toThrow(/não existe/);
  });
});

describe('computeVersion', () => {
  it('é determinística e muda quando um conteúdo muda', () => {
    const urls = listOutputFiles(outDir);
    const first = computeVersion(outDir, urls);
    expect(first).toMatch(/^[0-9a-f]{12}$/);
    expect(computeVersion(outDir, urls)).toBe(first);
    write('_next/static/chunks/a.js', 'console.log(2)');
    expect(computeVersion(outDir, urls)).not.toBe(first);
  });
});

describe('buildServiceWorker', () => {
  it('substitui os marcadores, compila e não tem anotações de tipo', () => {
    const urls = listOutputFiles(outDir);
    const result = buildServiceWorker(SW_SOURCE, 'abc123def456', urls);
    expect(result).not.toContain('__SW_VERSION__');
    expect(result).not.toContain('__SW_PRECACHE__');
    expect(result).toContain('"abc123def456"');
    expect(result).toContain(JSON.stringify(urls));
    // eslint-disable-next-line sonarjs/code-eval -- só compila o SW gerado para validar a sintaxe; não executa
    expect(() => new vm.Script(result)).not.toThrow();
    expect(result).not.toMatch(/:\s*(string|readonly|ServiceWorkerGlobalScope|Request)\b/);
    expect(result).not.toMatch(/\bas unknown\b/);
  });

  it('falha quando um marcador está ausente', () => {
    const source = SW_SOURCE.replace("'__SW_VERSION__'", "'x'");
    expect(() => buildServiceWorker(source, 'v', [])).toThrow(/__SW_VERSION__/);
  });

  it('falha quando um marcador está duplicado', () => {
    const source = `${SW_SOURCE}\nconst DUP: readonly string[] = ['__SW_PRECACHE__'];\n`;
    expect(() => buildServiceWorker(source, 'v', [])).toThrow(/__SW_PRECACHE__/);
  });
});

describe('generateServiceWorker', () => {
  it('grava out/sw.js a partir de src/pwa/sw.ts', () => {
    fs.mkdirSync(path.join(root, 'src', 'pwa'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'pwa', 'sw.ts'), SW_SOURCE);
    const message = generateServiceWorker(root);
    expect(message).toContain('6 URLs');
    const sw = fs.readFileSync(path.join(outDir, 'sw.js'), 'utf8');
    expect(sw).toContain('"/_next/static/chunks/a.js"');
    expect(sw).not.toContain('// antigo');
  });

  it('falha quando out/ não existe', () => {
    fs.rmSync(outDir, { recursive: true });
    expect(() => generateServiceWorker(root)).toThrow(/não existe/);
  });
});
