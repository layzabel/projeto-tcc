import crypto from 'node:crypto';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';

export type SwFs = {
  existsSync: (p: string) => boolean;
  readdirSync: (p: string, opts: { recursive: true }) => string[];
  statSync: (p: string) => { isFile: () => boolean };
  readFileSync: (p: string) => Buffer;
};

export class SwError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwError';
  }
}

const VERSION_MARKER = "'__SW_VERSION__'";
const PRECACHE_MARKER = "['__SW_PRECACHE__']";

const nodeSwFs: SwFs = {
  existsSync: (p) => fs.existsSync(p),
  readdirSync: (p) => fs.readdirSync(p, { recursive: true, encoding: 'utf8' }),
  statSync: (p) => fs.statSync(p),
  readFileSync: (p) => fs.readFileSync(p),
};

export function listOutputFiles(outDir: string, fsDeps: SwFs = nodeSwFs): string[] {
  if (!fsDeps.existsSync(outDir)) {
    throw new SwError(`diretório ${outDir} não existe; rode "next build" antes`);
  }
  const files = fsDeps
    .readdirSync(outDir, { recursive: true })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter((entry) => entry !== 'sw.js' && fsDeps.statSync(path.join(outDir, entry)).isFile())
    .sort((a, b) => a.localeCompare(b, 'en'));
  const urls = files.map((file) => `/${file}`);
  return files.includes('index.html') ? ['/', ...urls] : urls;
}

export function computeVersion(outDir: string, urls: readonly string[], fsDeps: SwFs = nodeSwFs) {
  const hash = crypto.createHash('sha256');
  for (const url of [...urls].sort((a, b) => a.localeCompare(b, 'en'))) {
    if (url === '/') {
      continue;
    }
    hash.update(url);
    hash.update('\0');
    hash.update(fsDeps.readFileSync(path.join(outDir, ...url.slice(1).split('/'))));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

function replaceOnce(source: string, marker: string, value: string): string {
  const count = source.split(marker).length - 1;
  if (count !== 1) {
    throw new SwError(`marcador ${marker} deve aparecer exatamente 1 vez (encontrado ${count})`);
  }
  return source.replace(marker, () => value);
}

export function buildServiceWorker(source: string, version: string, urls: readonly string[]) {
  const js = stripTypeScriptTypes(source, { mode: 'strip' });
  const withVersion = replaceOnce(js, VERSION_MARKER, JSON.stringify(version));
  return replaceOnce(withVersion, PRECACHE_MARKER, JSON.stringify(urls));
}

export function generateServiceWorker(root: string): string {
  const outDir = path.join(root, 'out');
  const urls = listOutputFiles(outDir);
  const version = computeVersion(outDir, urls);
  const source = fs.readFileSync(path.join(root, 'src', 'pwa', 'sw.ts'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'sw.js'), buildServiceWorker(source, version, urls), 'utf8');
  return `out/sw.js gerado: versão ${version}, ${urls.length} URLs em cache`;
}

function main(): void {
  try {
    console.log(generateServiceWorker(process.cwd()));
  } catch (error) {
    console.error(`GERAR SW FALHOU: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
