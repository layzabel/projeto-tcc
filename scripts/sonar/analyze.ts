import fs from 'node:fs';
import path from 'node:path';
import { ArgsError, parseArgs } from '../lib/args.ts';
import { run, type Exec } from '../lib/exec.ts';
import { metricsFilePath, resolveFeatureDir } from '../lib/feature.ts';
import { appendRows, readRows, type Row, type TableName } from '../metrics/table.ts';
import { createSonarApi, hostUrl, type FetchLike, type SonarApi } from './api.ts';
import { maxComplexity, type MaxComplexity } from './max-complexity.ts';
import { checkScopes } from './scope.ts';

export type Scope = 'app' | 'scripts';
export const SCOPES: readonly Scope[] = ['app', 'scripts'];

export const EXIT = {
  servidor: 10,
  cobertura: 11,
  scanner: 12,
  escopo: 13,
  etapa: 14,
  inesperado: 1,
} as const;

export const METRIC_KEYS = [
  'bugs',
  'vulnerabilities',
  'code_smells',
  'duplicated_lines_density',
  'complexity',
  'cognitive_complexity',
  'sqale_index',
  'sqale_rating',
  'coverage',
] as const;

export type AnalyzeFs = {
  existsSync: (p: string) => boolean;
  readFileSync: (p: string, encoding: 'utf8') => string;
  rmSync: (p: string, opts: { force: boolean }) => void;
};

export type AnalyzeDeps = {
  env: Record<string, string | undefined>;
  cwd: string;
  exec: Exec;
  fetch: FetchLike;
  fs: AnalyzeFs;
  listSources: (scope: Scope) => string[];
  maxComplexity: (files: readonly string[]) => Promise<MaxComplexity>;
  append: (filePath: string, table: TableName, rows: readonly Row[]) => void;
  log: { log: (m: string) => void; error: (m: string) => void };
};

export class AnalyzeError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'AnalyzeError';
    this.code = code;
  }
}

type ScanResult = { scope: Scope; key: string; analysisId: string; executedAt: string };

const ETAPA_REGEX = /^(implement|correcao-[1-9]\d*)$/;
const RATINGS = ['A', 'B', 'C', 'D', 'E'];

export function parseProperties(content: string): Record<string, string> {
  const entries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as const;
    });
  return Object.fromEntries(entries);
}

function existingRows(deps: AnalyzeDeps, file: string): Row[] {
  return deps.fs.existsSync(file) ? readRows(deps.fs.readFileSync(file, 'utf8'), 'sonar') : [];
}

function checkEtapa(etapa: string | undefined, rows: readonly Row[]): string {
  if (etapa === undefined || !ETAPA_REGEX.test(etapa)) {
    throw new AnalyzeError(
      EXIT.etapa,
      'SONAR FALHOU: --etapa deve ser "implement" ou "correcao-N"',
    );
  }
  const missing = SCOPES.filter((scope) => !rows.some((row) => row.escopo === scope));
  if (etapa.startsWith('correcao-') && missing.length > 0) {
    throw new AnalyzeError(
      EXIT.etapa,
      `SONAR FALHOU: sem linha de base do escopo ${missing.join(', ')}; ${etapa} recusada`,
    );
  }
  return etapa;
}

async function checkServer(deps: AnalyzeDeps, api: SonarApi, url: string): Promise<void> {
  deps.log.log(`SONAR_TOKEN definido: ${deps.env.SONAR_TOKEN ? 'sim' : 'não'}`);
  if (!deps.env.SONAR_TOKEN) {
    throw new AnalyzeError(EXIT.servidor, 'SONAR FALHOU: SONAR_TOKEN não definido');
  }
  const status = await api.systemStatus().catch(() => 'INDISPONIVEL');
  if (status !== 'UP') {
    throw new AnalyzeError(EXIT.servidor, `SONAR FALHOU: servidor indisponível em ${url}`);
  }
}

function readCeTaskId(deps: AnalyzeDeps, reportFile: string): string | undefined {
  if (!deps.fs.existsSync(reportFile)) {
    return undefined;
  }
  return parseProperties(deps.fs.readFileSync(reportFile, 'utf8')).ceTaskId || undefined;
}

async function scan(deps: AnalyzeDeps, api: SonarApi, scope: Scope, url: string) {
  const reportFile = path.join(deps.cwd, '.scannerwork', 'report-task.txt');
  deps.fs.rmSync(reportFile, { force: true });
  const propsFile = path.join(deps.cwd, `sonar-project.${scope}.properties`);
  const props = parseProperties(deps.fs.readFileSync(propsFile, 'utf8'));
  const defines = Object.entries(props).map(([key, value]) => `-D${key}=${value}`);
  deps.log.log(`SONAR ▶ escopo=${scope}`);
  const result = await deps.exec('npx', [
    'sonar-scanner-npm',
    ...defines,
    `-Dsonar.host.url=${url}`,
  ]);
  const ceTaskId = readCeTaskId(deps, reportFile);
  const task = ceTaskId ? await api.ceTask(ceTaskId).catch(() => undefined) : undefined;
  if (!task || task.status !== 'SUCCESS') {
    throw new AnalyzeError(
      EXIT.scanner,
      `SONAR FALHOU: scanner do escopo ${scope} (código ${result.code})`,
    );
  }
  if (result.code !== 0) {
    deps.log.log(`SONAR: escopo ${scope} analisado; Quality Gate reprovado (registrado)`);
  }
  return {
    scope,
    key: props['sonar.projectKey'] ?? '',
    analysisId: task.analysisId,
    executedAt: task.executedAt,
  };
}

async function verifyScopes(api: SonarApi, scans: readonly ScanResult[]): Promise<void> {
  const [app, scripts] = await Promise.all(scans.map((s) => api.listFiles(s.key)));
  const check = checkScopes(app ?? [], scripts ?? []);
  if (!check.ok) {
    throw new AnalyzeError(
      EXIT.escopo,
      `SONAR FALHOU: arquivos fora do escopo:\n${check.offenders.join('\n')}`,
    );
  }
}

function rating(value: string): string {
  return RATINGS[Math.round(Number(value)) - 1] ?? '';
}

async function buildRow(
  deps: AnalyzeDeps,
  api: SonarApi,
  scan: ScanResult,
  etapa: string,
  previous: readonly Row[],
): Promise<Row> {
  const measures = await api.measures(scan.key, METRIC_KEYS);
  const missing = METRIC_KEYS.filter((metric) => !measures[metric]);
  if (missing.length > 0) {
    throw new Error(`métricas ausentes no escopo ${scan.scope}: ${missing.join(', ')}`);
  }
  const max = await deps.maxComplexity(deps.listSources(scan.scope));
  const m = (metric: (typeof METRIC_KEYS)[number]) => measures[metric] ?? '';
  return {
    data_hora: new Date(scan.executedAt).toISOString(),
    etapa,
    escopo: scan.scope,
    analise: scan.analysisId,
    linha_base: previous.some((row) => row.escopo === scan.scope) ? 'não' : 'sim',
    bugs: m('bugs'),
    vulnerabilidades: m('vulnerabilities'),
    code_smells: m('code_smells'),
    duplicacao_pct: m('duplicated_lines_density'),
    ciclomatica_total: m('complexity'),
    ciclomatica_max_funcao: String(max.ciclomaticaMax),
    cognitiva_total: m('cognitive_complexity'),
    cognitiva_max_funcao: String(max.cognitivaMax),
    divida_min: m('sqale_index'),
    manutenibilidade: rating(m('sqale_rating')),
    cobertura_pct: m('coverage'),
    quality_gate: await api.gateStatus(scan.key),
  };
}

export async function analyze(argv: string[], deps: AnalyzeDeps): Promise<number> {
  try {
    const args = parseArgs(argv);
    const featureDir = resolveFeatureDir({ feature: args.feature, env: deps.env, cwd: deps.cwd });
    const file = metricsFilePath(featureDir);
    const previous = existingRows(deps, file);
    const etapa = checkEtapa(args.etapa, previous);
    const url = hostUrl(deps.env);
    const api = createSonarApi({ baseUrl: url, token: deps.env.SONAR_TOKEN, fetch: deps.fetch });
    await checkServer(deps, api, url);
    if (!deps.fs.existsSync(path.join(deps.cwd, 'coverage', 'lcov.info'))) {
      throw new AnalyzeError(
        EXIT.cobertura,
        'SONAR FALHOU: coverage/lcov.info não encontrado; rode "npm run verify" antes',
      );
    }
    const scans: ScanResult[] = [];
    for (const scope of SCOPES) {
      scans.push(await scan(deps, api, scope, url));
    }
    await verifyScopes(api, scans);
    const rows: Row[] = [];
    for (const s of scans) {
      rows.push(await buildRow(deps, api, s, etapa, previous));
    }
    deps.append(file, 'sonar', rows);
    report(deps, file, rows);
    return 0;
  } catch (error) {
    return fail(deps, error);
  }
}

function report(deps: AnalyzeDeps, file: string, rows: readonly Row[]): void {
  deps.log.log(`SONAR OK: 2 linhas gravadas em ${path.relative(deps.cwd, file)}`);
  for (const row of rows) {
    deps.log.log(Object.values(row).join(' | '));
    deps.log.log(`Quality Gate ${row.escopo}: ${row.quality_gate}`);
  }
}

function fail(deps: AnalyzeDeps, error: unknown): number {
  if (error instanceof AnalyzeError) {
    deps.log.error(error.message);
    return error.code;
  }
  const code = error instanceof ArgsError ? EXIT.etapa : EXIT.inesperado;
  deps.log.error(`SONAR FALHOU: ${(error as Error).message}`);
  return code;
}

function listSources(cwd: string) {
  return (scope: Scope): string[] => {
    const patterns = scope === 'app' ? ['src/**/*.ts', 'src/**/*.tsx'] : ['scripts/**/*.ts'];
    return fs
      .globSync(patterns, { cwd })
      .filter((file) => !file.endsWith('.d.ts'))
      .map((file) => path.join(cwd, file));
  };
}

export function defaultDeps(): AnalyzeDeps {
  const cwd = process.cwd();
  return {
    env: process.env,
    cwd,
    exec: run,
    fetch,
    fs,
    listSources: listSources(cwd),
    maxComplexity: (files) => maxComplexity(files),
    append: (file, table, rows) => appendRows(file, table, rows),
    log: console,
  };
}

if (import.meta.main) {
  process.exit(await analyze(process.argv.slice(2), defaultDeps()));
}
