import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exec } from '../../../scripts/lib/exec.ts';
import { appendRows, readRows } from '../../../scripts/metrics/table.ts';
import type { FetchLike } from '../../../scripts/sonar/api.ts';
import { analyze, type AnalyzeDeps } from '../../../scripts/sonar/analyze.ts';

const TOKEN = 'sqa_0123456789abcdef0123456789abcdef01234567';
const APP_KEY = 'tcc-controle-parental-app';
const SCRIPTS_KEY = 'tcc-controle-parental-scripts';

type Server = {
  status: string;
  tasks: Record<string, string>;
  gate: Record<string, string>;
  files: Record<string, string[]>;
};

type ScannerBehavior = { code: number; report: boolean };

let cwd: string;
let server: Server;
let scanner: Record<string, ScannerBehavior>;
let output: string[];
let execCalls: string[][];

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

const MEASURES = [
  ['bugs', '0'],
  ['vulnerabilities', '0'],
  ['code_smells', '2'],
  ['duplicated_lines_density', '0.0'],
  ['complexity', '12'],
  ['cognitive_complexity', '5'],
  ['sqale_index', '10'],
  ['sqale_rating', '1.0'],
  ['coverage', '87.5'],
].map(([metric, value]) => ({ metric, value }));

const ROUTES: Record<string, (params: URLSearchParams, key: string) => unknown> = {
  '/api/system/status': () => ({ status: server.status }),
  '/api/ce/task': (params) => {
    const id = params.get('id') ?? '';
    return {
      task: {
        status: server.tasks[id] ?? 'FAILED',
        analysisId: `an-${id}`,
        executedAt: '2026-11-01T10:00:00+0000',
      },
    };
  },
  '/api/measures/component_tree': (_params, key) => ({
    components: (server.files[key] ?? []).map((p) => ({ path: p })),
    paging: { total: (server.files[key] ?? []).length },
  }),
  '/api/measures/component': () => ({ component: { measures: MEASURES } }),
  '/api/qualitygates/project_status': (_params, key) => ({
    projectStatus: { status: server.gate[key] ?? 'OK' },
  }),
};

const fakeFetch: FetchLike = async (url) => {
  const { pathname, searchParams } = new URL(url);
  const key = searchParams.get('component') ?? searchParams.get('projectKey') ?? '';
  const route = ROUTES[pathname];
  // Como o servidor real (26.x): component_tree sem metricKeys responde 400.
  if (pathname === '/api/measures/component_tree' && !searchParams.get('metricKeys')) {
    return json({ errors: [{ msg: "The 'metricKeys' parameter is missing" }] }, 400);
  }
  return route ? json(route(searchParams, key)) : json({}, 404);
};

const fakeExec: Exec = async (cmd, args) => {
  execCalls.push([cmd, ...args]);
  const keyArg = args.find((a) => a.startsWith('-Dsonar.projectKey=')) ?? '';
  const scope = keyArg.endsWith('-app') ? 'app' : 'scripts';
  const behavior = scanner[scope] ?? { code: 0, report: true };
  if (behavior.report) {
    fs.mkdirSync(path.join(cwd, '.scannerwork'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '.scannerwork', 'report-task.txt'),
      `projectKey=${keyArg}\nceTaskId=task-${scope}\n`,
    );
  }
  return { code: behavior.code, stdout: '', stderr: '' };
};

const metricsFile = () => path.join(cwd, 'specs', '001-teste', 'metricas-ia.md');

function deps(overrides: Partial<AnalyzeDeps> = {}): AnalyzeDeps {
  return {
    env: { SONAR_TOKEN: TOKEN },
    cwd,
    exec: fakeExec,
    fetch: fakeFetch,
    fs,
    listSources: () => [],
    maxComplexity: async () => ({ ciclomaticaMax: 4, cognitivaMax: 3 }),
    append: vi.fn((file, table, rows) => appendRows(file, table, rows)),
    log: { log: (m) => output.push(m), error: (m) => output.push(m) },
    ...overrides,
  };
}

function rows() {
  return fs.existsSync(metricsFile())
    ? readRows(fs.readFileSync(metricsFile(), 'utf8'), 'sonar')
    : [];
}

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sonar-'));
  fs.mkdirSync(path.join(cwd, 'specs', '001-teste'), { recursive: true });
  fs.mkdirSync(path.join(cwd, 'coverage'));
  fs.writeFileSync(path.join(cwd, 'coverage', 'lcov.info'), 'TN:\n');
  for (const scope of ['app', 'scripts']) {
    fs.copyFileSync(
      path.resolve(`sonar-project.${scope}.properties`),
      path.join(cwd, `sonar-project.${scope}.properties`),
    );
  }
  server = {
    status: 'UP',
    tasks: { 'task-app': 'SUCCESS', 'task-scripts': 'SUCCESS' },
    gate: {},
    files: { [APP_KEY]: ['src/app/page.tsx'], [SCRIPTS_KEY]: ['scripts/lib/exec.ts'] },
  };
  scanner = {};
  output = [];
  execCalls = [];
});

afterEach(() => {
  fs.rmSync(cwd, { recursive: true, force: true });
  expect(output.join('\n')).not.toContain(TOKEN);
  expect(execCalls.flat().join(' ')).not.toContain(TOKEN);
});

describe('analyze', () => {
  it('servidor indisponível → código 10 e nada gravado', async () => {
    server.status = 'STARTING';
    const d = deps();
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(10);
    expect(output).toContain('SONAR FALHOU: servidor indisponível em http://localhost:9000');
    expect(d.append).not.toHaveBeenCalled();
  });

  it('fetch que lança (conexão recusada) → código 10', async () => {
    const d = deps({
      fetch: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(10);
    expect(d.append).not.toHaveBeenCalled();
  });

  it('SONAR_TOKEN ausente → código 10', async () => {
    const d = deps({ env: {} });
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(10);
    expect(output).toContain('SONAR FALHOU: SONAR_TOKEN não definido');
    expect(output).toContain('SONAR_TOKEN definido: não');
  });

  it('sem coverage/lcov.info → código 11', async () => {
    fs.rmSync(path.join(cwd, 'coverage'), { recursive: true });
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(11);
  });

  it('scanner falha no escopo scripts depois de app → código 12 e nada gravado', async () => {
    scanner.scripts = { code: 3, report: false };
    const d = deps();
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(12);
    expect(d.append).not.toHaveBeenCalled();
    expect(fs.existsSync(metricsFile())).toBe(false);
  });

  it('código ≠ 0 com report-task.txt e ceTask SUCCESS → gate reprovado, linhas gravadas', async () => {
    scanner.app = { code: 1, report: true };
    server.gate[APP_KEY] = 'ERROR';
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(0);
    const written = rows();
    expect(written.map((r) => [r.escopo, r.quality_gate])).toEqual([
      ['app', 'ERROR'],
      ['scripts', 'OK'],
    ]);
  });

  it('código ≠ 0 sem report-task.txt → código 12', async () => {
    scanner.app = { code: 1, report: false };
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(12);
  });

  it('código ≠ 0 com ceTask diferente de SUCCESS → código 12', async () => {
    scanner.app = { code: 1, report: true };
    server.tasks['task-app'] = 'FAILED';
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(12);
  });

  it('apaga report-task.txt antigo antes do scanner e não o lê', async () => {
    fs.mkdirSync(path.join(cwd, '.scannerwork'));
    fs.writeFileSync(path.join(cwd, '.scannerwork', 'report-task.txt'), 'ceTaskId=antigo\n');
    server.tasks.antigo = 'SUCCESS';
    scanner.app = { code: 1, report: false };
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(12);
  });

  it('verificação de escopo falha → código 13 e nada gravado', async () => {
    server.files[APP_KEY] = ['src/app/page.tsx', 'tests/unit/app/page.test.tsx'];
    const d = deps();
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(13);
    expect(output.join('\n')).toContain('tests/unit/app/page.test.tsx');
    expect(d.append).not.toHaveBeenCalled();
  });

  it('grava 2 linhas com uma única chamada; linha de base só na primeira execução', async () => {
    const d = deps();
    await expect(analyze(['--etapa', 'implement'], d)).resolves.toBe(0);
    expect(d.append).toHaveBeenCalledTimes(1);
    const first = rows();
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      data_hora: '2026-11-01T10:00:00.000Z',
      etapa: 'implement',
      escopo: 'app',
      analise: 'an-task-app',
      linha_base: 'sim',
      code_smells: '2',
      ciclomatica_max_funcao: '4',
      cognitiva_max_funcao: '3',
      manutenibilidade: 'A',
      cobertura_pct: '87.5',
      quality_gate: 'OK',
    });
    expect(first[1]?.linha_base).toBe('sim');
    await expect(analyze(['--etapa', 'correcao-1'], deps())).resolves.toBe(0);
    expect(
      rows()
        .slice(2)
        .map((r) => [r.etapa, r.linha_base]),
    ).toEqual([
      ['correcao-1', 'não'],
      ['correcao-1', 'não'],
    ]);
  });

  it('passa o host por -D e nunca o token', async () => {
    await expect(analyze(['--etapa', 'implement'], deps())).resolves.toBe(0);
    expect(execCalls[0]).toContain('-Dsonar.host.url=http://localhost:9000');
    expect(execCalls[0]).toContain('-Dsonar.sources=src');
    expect(execCalls[1]).toContain('-Dsonar.sources=scripts');
  });

  it('--etapa correcao-1 sem linha de base → recusado e nada gravado', async () => {
    const d = deps();
    await expect(analyze(['--etapa', 'correcao-1'], d)).resolves.toBe(14);
    expect(execCalls).toEqual([]);
    expect(d.append).not.toHaveBeenCalled();
  });

  it.each([[[]], [['--etapa', 'plan']]])('etapa inválida %j → recusado', async (argv) => {
    await expect(analyze(argv, deps())).resolves.toBe(14);
  });
});
