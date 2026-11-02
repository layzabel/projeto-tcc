import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  HEADER,
  IA_COLUMNS,
  SONAR_COLUMNS,
  appendRows,
  formatRow,
  nodeTableFs,
  readRows,
  type Row,
} from '../../../scripts/metrics/table.ts';

function iaRow(etapa: string, extra: Partial<Row> = {}): Row {
  const row: Row = Object.fromEntries(IA_COLUMNS.map((column) => [column, '1']));
  return { ...row, etapa, observacao: '', ...extra };
}

function sonarRow(escopo: string): Row {
  const row: Row = Object.fromEntries(SONAR_COLUMNS.map((column) => [column, '0']));
  return { ...row, escopo };
}

function hash(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

let dir: string;
let file: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metricas-'));
  const featureDir = path.join(dir, '001-teste');
  fs.mkdirSync(featureDir);
  file = path.join(featureDir, 'metricas-ia.md');
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('appendRows', () => {
  it('cria o arquivo com o cabeçalho do contrato e 1 linha', () => {
    appendRows(file, 'ia', [iaRow('plan')]);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const header = HEADER('001-teste').split('\n');
    expect(lines).toHaveLength(header.length + 1);
    expect(content.startsWith('# Métricas de IA e Qualidade — 001-teste')).toBe(true);
    expect(readRows(content, 'ia')).toHaveLength(1);
    expect(readRows(content, 'ia')[0]?.etapa).toBe('plan');
  });

  it('mantém as linhas anteriores idênticas byte a byte após duas gravações (SC-006)', () => {
    appendRows(file, 'ia', [iaRow('plan')]);
    const before = fs.readFileSync(file, 'utf8').split('\n');
    appendRows(file, 'ia', [iaRow('tasks')]);
    const after = fs.readFileSync(file, 'utf8').split('\n');
    expect(after).toHaveLength(before.length + 1);
    const inserted = after.findIndex((line, index) => line !== before[index]);
    expect([...after.slice(0, inserted), ...after.slice(inserted + 1)]).toEqual(before);
    expect(readRows(after.join('\n'), 'ia').map((row) => row.etapa)).toEqual(['plan', 'tasks']);
  });

  it('gravar na tabela ia não altera a tabela sonar e vice-versa', () => {
    appendRows(file, 'sonar', [sonarRow('app'), sonarRow('scripts')]);
    const sonarBefore = readRows(fs.readFileSync(file, 'utf8'), 'sonar');
    appendRows(file, 'ia', [iaRow('plan')]);
    const content = fs.readFileSync(file, 'utf8');
    expect(readRows(content, 'sonar')).toEqual(sonarBefore);
    const iaBefore = readRows(content, 'ia');
    appendRows(file, 'sonar', [sonarRow('app'), sonarRow('scripts')]);
    const final = fs.readFileSync(file, 'utf8');
    expect(readRows(final, 'ia')).toEqual(iaBefore);
    expect(readRows(final, 'sonar')).toHaveLength(4);
  });

  it('preserva o fim de linha \\r\\n existente', () => {
    fs.writeFileSync(file, HEADER('001-teste').replaceAll('\n', '\r\n'));
    appendRows(file, 'ia', [iaRow('plan')]);
    const content = fs.readFileSync(file, 'utf8');
    expect(content.split('\r\n')).toHaveLength(content.split('\n').length);
    expect(readRows(content, 'ia')).toHaveLength(1);
  });

  it('interrupção antes do rename deixa o original intacto e sem linha parcial', () => {
    appendRows(file, 'ia', [iaRow('plan')]);
    const original = hash(file);
    const failing = {
      ...nodeTableFs,
      renameSync: () => {
        throw new Error('interrompido');
      },
    };
    expect(() => appendRows(file, 'ia', [iaRow('tasks')], failing)).toThrow('interrompido');
    expect(hash(file)).toBe(original);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
  });

  it.each(['a|b', 'a\nb'])('recusa célula inválida %j e não toca o arquivo', (value) => {
    appendRows(file, 'ia', [iaRow('plan')]);
    const original = hash(file);
    expect(() => appendRows(file, 'ia', [iaRow('tasks', { observacao: value })])).toThrow();
    expect(hash(file)).toBe(original);
  });

  it('recusa linha sem todas as colunas', () => {
    expect(() => appendRows(file, 'ia', [{ etapa: 'plan' }])).toThrow(/coluna ausente/);
    expect(fs.existsSync(file)).toBe(false);
  });
});

describe('formatRow e readRows', () => {
  it('formata célula vazia como no contrato', () => {
    expect(formatRow(['a', ''])).toBe('| a | |');
  });

  it('readRows falha quando falta uma âncora', () => {
    expect(() => readRows('# vazio\n', 'ia')).toThrow(/âncora/);
  });
});
