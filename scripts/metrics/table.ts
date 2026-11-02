import fs from 'node:fs';
import path from 'node:path';

export type TableName = 'ia' | 'sonar';
export type Row = Record<string, string>;

export type TableFs = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: 'utf8') => string;
  writeFileSync: (path: string, data: string, encoding: 'utf8') => void;
  renameSync: (from: string, to: string) => void;
  rmSync: (path: string, opts: { force: boolean }) => void;
};

export class TableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TableError';
  }
}

export const IA_COLUMNS = [
  'data_hora',
  'etapa',
  'modelo',
  'tokens_entrada',
  'tokens_saida',
  'tokens_cache_escrita',
  'tokens_cache_leitura',
  'custo_usd',
  'prompts',
  'rodadas_correcao',
  'versao_ccusage',
  'sessoes',
  'tipo',
  'observacao',
] as const;

export const SONAR_COLUMNS = [
  'data_hora',
  'etapa',
  'escopo',
  'analise',
  'linha_base',
  'bugs',
  'vulnerabilidades',
  'code_smells',
  'duplicacao_pct',
  'ciclomatica_total',
  'ciclomatica_max_funcao',
  'cognitiva_total',
  'cognitiva_max_funcao',
  'divida_min',
  'manutenibilidade',
  'cobertura_pct',
  'quality_gate',
] as const;

export const COLUMNS: Record<TableName, readonly string[]> = {
  ia: IA_COLUMNS,
  sonar: SONAR_COLUMNS,
};

function headerLines(columns: readonly string[]): string[] {
  return [`| ${columns.join(' | ')} |`, `|${columns.map(() => '---').join('|')}|`];
}

export function HEADER(feature: string): string {
  return [
    `# Métricas de IA e Qualidade — ${feature}`,
    '',
    'Arquivo gerado e mantido pelos scripts `metrics:ia` e `sonar`. Não editar à mão.',
    'Fonte de tokens e custo: ccusage (relatório de sessões, `--offline`). Fonte de qualidade: SonarQube local.',
    '',
    '## Medições de IA',
    '',
    '<!-- tabela:ia -->',
    ...headerLines(IA_COLUMNS),
    '<!-- fim:ia -->',
    '',
    '## Medições SonarQube',
    '',
    '<!-- tabela:sonar -->',
    ...headerLines(SONAR_COLUMNS),
    '<!-- fim:sonar -->',
    '',
  ].join('\n');
}

export function formatRow(cells: readonly string[]): string {
  for (const cell of cells) {
    if (/[|\r\n]/.test(cell)) {
      throw new TableError(
        `célula inválida (contém "|" ou quebra de linha): ${JSON.stringify(cell)}`,
      );
    }
  }
  const padded = cells.map((cell) => (cell === '' ? ' ' : ' ' + cell + ' '));
  return '|' + padded.join('|') + '|';
}

function splitLines(content: string): { lines: string[]; eol: string } {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  return { lines: content.split(eol), eol };
}

function anchorIndex(lines: readonly string[], anchor: string): number {
  const matches = lines.flatMap((line, index) => (line.trim() === anchor ? [index] : []));
  if (matches.length !== 1) {
    throw new TableError(`âncora ${anchor} ausente ou repetida no arquivo de métricas`);
  }
  return matches[0] as number;
}

function tableBounds(lines: readonly string[], table: TableName): { start: number; end: number } {
  const open = anchorIndex(lines, `<!-- tabela:${table} -->`);
  const end = anchorIndex(lines, `<!-- fim:${table} -->`);
  const start = open + 3;
  if (end < start) {
    throw new TableError(`tabela ${table} fora do formato (cabeçalho incompleto)`);
  }
  return { start, end };
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function readRows(content: string, table: TableName): Row[] {
  const { lines } = splitLines(content);
  const { start, end } = tableBounds(lines, table);
  const columns = parseCells(lines[start - 2] ?? '');
  return lines.slice(start, end).map((line, index) => {
    const cells = parseCells(line);
    if (cells.length !== columns.length) {
      throw new TableError(`linha ${index + 1} da tabela ${table} com número de colunas inválido`);
    }
    return Object.fromEntries(columns.map((column, i) => [column, cells[i] ?? '']));
  });
}

export function rowToCells(table: TableName, row: Row): string[] {
  return COLUMNS[table].map((column) => {
    const value = row[column];
    if (value === undefined) {
      throw new TableError(`coluna ausente na linha da tabela ${table}: ${column}`);
    }
    return value;
  });
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

function checkInvariant(oldLines: string[], newLines: string[], at: number, count: number): void {
  const ok =
    newLines.length === oldLines.length + count &&
    sameLines(newLines.slice(0, at), oldLines.slice(0, at)) &&
    sameLines(newLines.slice(at + count), oldLines.slice(at));
  if (!ok) {
    throw new TableError('invariante somente-acréscimo violado; gravação abortada');
  }
}

export const nodeTableFs: TableFs = {
  existsSync: (p) => fs.existsSync(p),
  readFileSync: (p, encoding) => fs.readFileSync(p, encoding),
  writeFileSync: (p, data, encoding) => fs.writeFileSync(p, data, encoding),
  renameSync: (from, to) => fs.renameSync(from, to),
  rmSync: (p, opts) => fs.rmSync(p, opts),
};

export function appendRows(
  filePath: string,
  table: TableName,
  rows: readonly Row[],
  fsDeps: TableFs = nodeTableFs,
): void {
  if (rows.length === 0) {
    throw new TableError('nenhuma linha para gravar');
  }
  const formatted = rows.map((row) => formatRow(rowToCells(table, row)));
  const original = fsDeps.existsSync(filePath)
    ? fsDeps.readFileSync(filePath, 'utf8')
    : HEADER(path.basename(path.dirname(filePath)));
  const { lines: oldLines, eol } = splitLines(original);
  readRows(original, table);
  const { end } = tableBounds(oldLines, table);
  const newLines = [...oldLines.slice(0, end), ...formatted, ...oldLines.slice(end)];
  checkInvariant(oldLines, newLines, end, formatted.length);
  const tmpPath = `${filePath}.tmp`;
  try {
    fsDeps.writeFileSync(tmpPath, newLines.join(eol), 'utf8');
    fsDeps.renameSync(tmpPath, filePath);
  } catch (error) {
    fsDeps.rmSync(tmpPath, { force: true });
    throw error;
  }
}
