import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkIa } from '../../../scripts/metrics/check-ia.ts';
import { IA_COLUMNS, appendRows, type Row } from '../../../scripts/metrics/table.ts';
import { ccusageOutput, fakeCcusage } from '../../helpers/metrics.ts';

let cwd: string;
let output: string[];

const S = { a: 'sess-a', b: 'sess-b', c: 'sess-c', r: 'sess-r' };
const SESSIONS = {
  [S.a]: ccusageOutput(S.a, '0.1234567890123'),
  [S.b]: ccusageOutput(S.b, '1.5'),
  [S.c]: ccusageOutput(S.c, '2.25'),
  [S.r]: ccusageOutput(S.r, '0.05'),
};

function row(etapa: string, sessoes: string, overrides: Partial<Row> = {}): Row {
  const base: Row = Object.fromEntries(IA_COLUMNS.map((c) => [c, '']));
  return {
    ...base,
    data_hora: '2026-10-31T13:56:12.001Z',
    etapa,
    modelo: 'claude-opus-5-5+claude-sonnet-5-5',
    tokens_entrada: String(10 * sessoes.split(',').length),
    tokens_saida: String(520 * sessoes.split(',').length),
    tokens_cache_escrita: String(12500 * sessoes.split(',').length),
    tokens_cache_leitura: String(73000 * sessoes.split(',').length),
    prompts: '3',
    rodadas_correcao: '0',
    versao_ccusage: '20.0.46',
    sessoes,
    tipo: 'retroativo',
    ...overrides,
  };
}

function writeFeature(feature: string, rows: Row[]): string {
  const file = path.join(cwd, 'specs', feature, 'metricas-ia.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendRows(file, 'ia', rows);
  return file;
}

function hashAll(): string {
  const files = ['001-a', '002-b'].map((f) => path.join(cwd, 'specs', f, 'metricas-ia.md'));
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex');
}

const log = () => ({ log: (m: string) => output.push(m), error: (m: string) => output.push(m) });

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'check-'));
  output = [];
  writeFeature('001-a', [
    row('plan', S.a, { custo_usd: '0.1234567890123' }),
    row('analyze', `${S.b},${S.c}`, { custo_usd: '3.75' }),
  ]);
  writeFeature('002-b', [row('registro', S.r, { custo_usd: '0.05' })]);
});

afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

describe('checkIa (SC-005)', () => {
  it('todas as linhas idênticas → código 0', async () => {
    const before = hashAll();
    await expect(checkIa({ cwd, exec: fakeCcusage(SESSIONS).exec, log: log() })).resolves.toBe(0);
    expect(output).toContain('METRICS CHECK OK: 3/3 linhas idênticas');
    expect(hashAll()).toBe(before);
  });

  it('custo divergente só no último dígito → código 30 com feature, linha, coluna', async () => {
    const before = hashAll();
    const sessions = { ...SESSIONS, [S.a]: ccusageOutput(S.a, '0.1234567890124') };
    await expect(checkIa({ cwd, exec: fakeCcusage(sessions).exec, log: log() })).resolves.toBe(30);
    expect(output).toContain(
      'DIVERGÊNCIA feature=001-a linha=1 coluna=custo_usd esperado=0.1234567890124 obtido=0.1234567890123',
    );
    expect(hashAll()).toBe(before);
  });

  it('token divergente → código 30', async () => {
    const sessions = {
      ...SESSIONS,
      [S.r]: ccusageOutput(S.r, '0.05').replace('"inputTokens": 3', '"inputTokens": 4'),
    };
    await expect(checkIa({ cwd, exec: fakeCcusage(sessions).exec, log: log() })).resolves.toBe(30);
    expect(output.some((l) => l.includes('feature=002-b linha=1 coluna=tokens_entrada'))).toBe(
      true,
    );
  });

  it('usa a versão da linha e --offline', async () => {
    const fake = fakeCcusage(SESSIONS);
    await checkIa({ cwd, exec: fake.exec, log: log() });
    expect(fake.calls[0]).toEqual([
      'npx',
      '-y',
      'ccusage@20.0.46',
      'session',
      '--json',
      '--offline',
      '--id',
      S.a,
    ]);
  });

  it('falha do ccusage numa linha → código 30 com o motivo', async () => {
    const sessions = { ...SESSIONS };
    delete sessions[S.c];
    await expect(checkIa({ cwd, exec: fakeCcusage(sessions).exec, log: log() })).resolves.toBe(30);
    expect(output.some((l) => l.includes('linha=2') && l.includes('ccusage falhou'))).toBe(true);
  });
});
