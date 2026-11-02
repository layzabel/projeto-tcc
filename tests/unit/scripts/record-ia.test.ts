import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IA_COLUMNS, appendRows, readRows } from '../../../scripts/metrics/table.ts';
import { recordIa, type RecordDeps } from '../../../scripts/metrics/record-ia.ts';
import {
  addTranscript,
  ccusageOutput,
  createWorkspace,
  fakeCcusage,
  removeWorkspace,
  type Workspace,
} from '../../helpers/metrics.ts';

const ID1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const ID2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const ACTIVE = 'aaaaaaaa-0000-4000-8000-00000000000f';

let ws: Workspace;
let output: string[];

function deps(sessions: Record<string, string> = {}, code = 0): RecordDeps {
  return {
    env: {},
    cwd: ws.cwd,
    home: ws.home,
    exec: fakeCcusage(
      { [ID1]: ccusageOutput(ID1, '0.1'), [ID2]: ccusageOutput(ID2, '0.2'), ...sessions },
      code,
    ).exec,
    append: vi.fn((file, table, rows) => appendRows(file, table, rows)),
    log: { log: (m) => output.push(m), error: (m) => output.push(m) },
  };
}

const metricsFile = () => path.join(ws.feature, 'metricas-ia.md');
const hash = () =>
  fs.existsSync(metricsFile())
    ? crypto.createHash('sha256').update(fs.readFileSync(metricsFile())).digest('hex')
    : 'inexistente';
const rows = () => readRows(fs.readFileSync(metricsFile(), 'utf8'), 'ia');

beforeEach(() => {
  ws = createWorkspace();
  output = [];
  addTranscript(ws, ID1, new Date('2026-10-01'));
  addTranscript(ws, ID2, new Date('2026-10-02'));
  addTranscript(ws, ACTIVE, new Date('2026-11-01'));
});

afterEach(() => removeWorkspace(ws));

const base = (etapa: string, ...rest: string[]) => ['--etapa', etapa, '--sessao', ID1, ...rest];

describe('recordIa — falhas não gravam nada', () => {
  it('ccusage indisponível → código 22', async () => {
    const d = deps({}, 1);
    await expect(recordIa(base('plan', '--correcoes', '0'), d)).resolves.toBe(22);
    expect(hash()).toBe('inexistente');
    expect(d.append).not.toHaveBeenCalled();
  });

  it('sessão inexistente no ccusage → código 22', async () => {
    const missing = '00000000-0000-0000-0000-000000000000';
    addTranscript(ws, missing, new Date('2026-09-01'));
    const argv = ['--etapa', 'plan', '--sessao', missing, '--correcoes', '0'];
    await expect(recordIa(argv, deps())).resolves.toBe(22);
    expect(hash()).toBe('inexistente');
  });

  it('sessão ativa → código 21', async () => {
    const argv = ['--etapa', 'implement', '--sessao', ACTIVE, '--correcoes', '0'];
    await expect(recordIa(argv, deps())).resolves.toBe(21);
  });

  it('sessão já registrada → código 21', async () => {
    await expect(recordIa(base('plan', '--correcoes', '0'), deps())).resolves.toBe(0);
    const before = hash();
    await expect(recordIa(base('tasks', '--correcoes', '0'), deps())).resolves.toBe(21);
    expect(hash()).toBe(before);
  });

  it('sem --correcoes → código 20 com os prompts numerados', async () => {
    const d = deps();
    await expect(recordIa(base('plan', '--retroativo'), d)).resolves.toBe(20);
    expect(output).toContain('Prompts encontrados (3):');
    expect(output.some((line) => line.startsWith('1. ') && line.includes('/speckit-plan'))).toBe(
      true,
    );
    expect(output).toContain('3. Corrija o erro de digitação no plano.');
    expect(d.append).not.toHaveBeenCalled();
  });

  it.each([
    ['correcao-1 com 0 correções', base('correcao-1', '--correcoes', '0')],
    ['registro com 1 correção', base('registro', '--correcoes', '1')],
    ['registro agregado', base('registro+plan', '--correcoes', '0')],
    ['agregada sem --retroativo e sem --obs', base('plan+tasks', '--correcoes', '0')],
    ['--obs com "|"', base('plan', '--correcoes', '0', '--obs', 'a|b')],
    ['etapa desconhecida', base('deploy', '--correcoes', '0')],
    ['correcoes negativa', base('plan', '--correcoes', '-1')],
  ])('%s → recusado', async (_label, argv) => {
    const d = deps();
    await expect(recordIa(argv, d)).resolves.not.toBe(0);
    expect(d.append).not.toHaveBeenCalled();
    expect(hash()).toBe('inexistente');
  });
});

describe('recordIa — gravação', () => {
  it('caso válido → 1 linha com as 14 colunas na ordem do contrato', async () => {
    await expect(recordIa(base('plan', '--correcoes', '1'), deps())).resolves.toBe(0);
    const [row] = rows();
    expect(Object.keys(row ?? {})).toEqual([...IA_COLUMNS]);
    expect(row).toEqual({
      data_hora: '2026-10-31T13:56:12.001Z',
      etapa: 'plan',
      modelo: 'claude-opus-5-5+claude-sonnet-5-5',
      tokens_entrada: '10',
      tokens_saida: '520',
      tokens_cache_escrita: '12500',
      tokens_cache_leitura: '73000',
      custo_usd: '0.1',
      prompts: '3',
      rodadas_correcao: '1',
      versao_ccusage: '20.0.46',
      sessoes: ID1,
      tipo: 'no momento',
      observacao: '',
    });
  });

  it('agregada com --obs é aceita sem --retroativo', async () => {
    const argv = base('plan+tasks', '--correcoes', '0', '--obs', 'desvio: sessão com duas etapas');
    await expect(recordIa(argv, deps())).resolves.toBe(0);
    expect(rows()[0]).toMatchObject({
      etapa: 'plan+tasks',
      tipo: 'no momento',
      observacao: 'desvio: sessão com duas etapas',
    });
  });

  it('agregada retroativa sem --obs é aceita', async () => {
    const argv = base('constitution+specify', '--retroativo', '--correcoes', '2');
    await expect(recordIa(argv, deps())).resolves.toBe(0);
    expect(rows()[0]).toMatchObject({ tipo: 'retroativo', rodadas_correcao: '2' });
  });

  it('registro com --correcoes 0 é aceito', async () => {
    await expect(recordIa(base('registro', '--correcoes', '0'), deps())).resolves.toBe(0);
    expect(rows()[0]?.etapa).toBe('registro');
  });

  it('--sessao id1,id2 soma os totais e guarda os dois IDs', async () => {
    const argv = ['--etapa', 'analyze', '--sessao', `${ID1},${ID2}`, '--correcoes', '3'];
    await expect(recordIa(argv, deps())).resolves.toBe(0);
    expect(rows()[0]).toMatchObject({
      sessoes: `${ID1},${ID2}`,
      tokens_entrada: '20',
      custo_usd: '0.3',
      prompts: '6',
    });
  });
});
