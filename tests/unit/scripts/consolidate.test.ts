import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { consolidate } from '../../../scripts/metrics/consolidate.ts';
import {
  IA_COLUMNS,
  SONAR_COLUMNS,
  appendRows,
  readRows,
  type Row,
} from '../../../scripts/metrics/table.ts';

let cwd: string;
let output: string[];

function ia(etapa: string, n: number, custo: string, correcoes = '0'): Row {
  const base: Row = Object.fromEntries(IA_COLUMNS.map((c) => [c, 'x']));
  return {
    ...base,
    etapa,
    tokens_entrada: String(n),
    tokens_saida: String(n * 10),
    tokens_cache_escrita: String(n * 100),
    tokens_cache_leitura: String(n * 1000),
    custo_usd: custo,
    prompts: String(n),
    rodadas_correcao: correcoes,
    observacao: '',
  };
}

function sonar(escopo: string, etapa: string, gate: string): Row {
  const base: Row = Object.fromEntries(SONAR_COLUMNS.map((c) => [c, '0']));
  return { ...base, escopo, etapa, quality_gate: gate };
}

function feature(name: string, iaRows: Row[], sonarRows: Row[]): void {
  const file = path.join(cwd, 'specs', name, 'metricas-ia.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  appendRows(file, 'ia', iaRows);
  if (sonarRows.length > 0) {
    appendRows(file, 'sonar', sonarRows);
  }
}

const out = () => path.join(cwd, 'docs', 'metricas', 'consolidado.md');
const log = () => ({ log: (m: string) => output.push(m), error: (m: string) => output.push(m) });

function section(content: string, title: string): string {
  const start = content.indexOf(`## ${title}`);
  const end = content.indexOf('\n## ', start + 1);
  return content.slice(start, end === -1 ? undefined : end);
}

function tableRows(sectionText: string): string[][] {
  return sectionText
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .slice(2)
    .map((l) =>
      l
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    );
}

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'consol-'));
  output = [];
  feature(
    '001-a',
    [ia('plan', 1, '0.1', '1'), ia('registro', 5, '0.05'), ia('implement', 2, '0.2')],
    [
      sonar('app', 'implement', 'ERROR'),
      sonar('scripts', 'implement', 'ERROR'),
      sonar('app', 'correcao-1', 'OK'),
    ],
  );
  feature('002-b', [ia('specify', 3, '1.25'), ia('registro', 7, '0.5')], []);
});

afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));

describe('consolidate (FR-018)', () => {
  it('soma IA por feature e total sem as linhas registro', () => {
    expect(consolidate({ cwd, log: log() })).toBe(0);
    const content = fs.readFileSync(out(), 'utf8');
    expect(content).toContain('gerado por `npm run metrics:consolidar`; não editar à mão');
    const rows = tableRows(section(content, 'IA por feature'));
    expect(rows).toEqual([
      ['001-a', '3', '30', '300', '3000', '0.3', '3', '1'],
      ['002-b', '3', '30', '300', '3000', '1.25', '3', '0'],
      ['Total', '6', '60', '600', '6000', '1.55', '6', '1'],
    ]);
  });

  it('custo de medição soma só as linhas registro, em seção própria', () => {
    consolidate({ cwd, log: log() });
    const content = fs.readFileSync(out(), 'utf8');
    const rows = tableRows(
      section(content, 'Custo de medição — sessões de registro (fora da comparação)'),
    );
    expect(rows.map((r) => [r[0], r[1], r[5]])).toEqual([
      ['001-a', '5', '0.05'],
      ['002-b', '7', '0.5'],
      ['Total', '12', '0.55'],
    ]);
  });

  it('última linha SonarQube de cada escopo, com app antes e separado de scripts', () => {
    consolidate({ cwd, log: log() });
    const content = fs.readFileSync(out(), 'utf8');
    const appTitle = 'Escopo app — base da comparação com o braço de vibe coding';
    const scriptsTitle = 'Escopo scripts — dado complementar';
    expect(content.indexOf(appTitle)).toBeLessThan(content.indexOf(scriptsTitle));
    const app = tableRows(section(content, appTitle));
    expect(app).toHaveLength(1);
    expect(app[0]?.[0]).toBe('001-a');
    expect(app[0]).toContain('correcao-1');
    expect(app[0]?.at(-1)).toBe('OK');
    const scripts = tableRows(section(content, scriptsTitle));
    expect(scripts.map((r) => [r[0], r.at(-1)])).toEqual([['001-a', 'ERROR']]);
  });

  it('arquivo fora do formato → código 40 e consolidado não gravado', () => {
    const file = path.join(cwd, 'specs', '002-b', 'metricas-ia.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('<!-- fim:ia -->', ''));
    expect(consolidate({ cwd, log: log() })).toBe(40);
    expect(fs.existsSync(out())).toBe(false);
  });

  it('as tabelas geradas são lidas de volta sem erro', () => {
    consolidate({ cwd, log: log() });
    expect(() =>
      readRows(
        fs.readFileSync(path.join(cwd, 'specs', '001-a', 'metricas-ia.md'), 'utf8'),
        'sonar',
      ),
    ).not.toThrow();
  });
});
