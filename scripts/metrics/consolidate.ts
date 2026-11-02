import fs from 'node:fs';
import path from 'node:path';
import { metricsFiles } from './check-ia.ts';
import { sumDecimals } from './ccusage.ts';
import { SONAR_COLUMNS, formatRow, readRows, type Row } from './table.ts';

export const EXIT_FORMATO = 40;

type FeatureRows = { feature: string; ia: Row[]; sonar: Row[] };

const INT_COLUMNS = [
  'tokens_entrada',
  'tokens_saida',
  'tokens_cache_escrita',
  'tokens_cache_leitura',
] as const;
const COUNT_COLUMNS = ['prompts', 'rodadas_correcao'] as const;
const IA_HEADER = ['feature', ...INT_COLUMNS, 'custo_usd', ...COUNT_COLUMNS];
const SONAR_HEADER = ['feature', ...SONAR_COLUMNS.filter((c) => c !== 'escopo')];

function sumInt(rows: readonly Row[], column: string): string {
  return rows.reduce((total, row) => total + BigInt(row[column] || '0'), 0n).toString();
}

function totalsCells(label: string, rows: readonly Row[]): string[] {
  return [
    label,
    ...INT_COLUMNS.map((c) => sumInt(rows, c)),
    sumDecimals(rows.map((r) => r.custo_usd || '0').concat(rows.length === 0 ? ['0'] : [])),
    ...COUNT_COLUMNS.map((c) => sumInt(rows, c)),
  ];
}

function table(header: readonly string[], body: readonly string[][]): string[] {
  return [formatRow(header), formatRow(header.map(() => '---')), ...body.map((c) => formatRow(c))];
}

function iaSection(title: string, data: readonly FeatureRows[], pick: (r: Row) => boolean) {
  const perFeature = data.map((f) => ({ feature: f.feature, rows: f.ia.filter(pick) }));
  const body = perFeature.map((f) => totalsCells(f.feature, f.rows));
  const all = perFeature.flatMap((f) => f.rows);
  return [`## ${title}`, '', ...table(IA_HEADER, [...body, totalsCells('Total', all)]), ''];
}

function sonarSection(title: string, data: readonly FeatureRows[], escopo: string) {
  const body = data.flatMap((f) => {
    const last = f.sonar.filter((r) => r.escopo === escopo).at(-1);
    return last ? [[f.feature, ...SONAR_HEADER.slice(1).map((c) => last[c] ?? '')]] : [];
  });
  return [`## ${title}`, '', ...table(SONAR_HEADER, body), ''];
}

export function renderConsolidado(data: readonly FeatureRows[]): string {
  const isRegistro = (r: Row) => r.etapa === 'registro';
  return [
    '# Consolidado de métricas do projeto',
    '',
    '> Arquivo gerado por `npm run metrics:consolidar`; não editar à mão.',
    '',
    ...iaSection('IA por feature — etapas (sem sessões de registro)', data, (r) => !isRegistro(r)),
    ...iaSection('Custo de medição — sessões de registro (fora da comparação)', data, isRegistro),
    ...sonarSection('Escopo app — base da comparação com o braço de vibe coding', data, 'app'),
    ...sonarSection('Escopo scripts — dado complementar', data, 'scripts'),
  ].join('\n');
}

export function consolidate(deps: {
  cwd: string;
  log: { log: (m: string) => void; error: (m: string) => void };
}): number {
  const data: FeatureRows[] = [];
  for (const { feature, file } of metricsFiles(deps.cwd)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      data.push({ feature, ia: readRows(content, 'ia'), sonar: readRows(content, 'sonar') });
    } catch (error) {
      deps.log.error(`CONSOLIDAR FALHOU: ${feature} fora do formato (${(error as Error).message})`);
      return EXIT_FORMATO;
    }
  }
  const out = path.join(deps.cwd, 'docs', 'metricas', 'consolidado.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(`${out}.tmp`, renderConsolidado(data), 'utf8');
  fs.renameSync(`${out}.tmp`, out);
  deps.log.log(`CONSOLIDAR OK: ${path.relative(deps.cwd, out)} (${data.length} features)`);
  return 0;
}

if (import.meta.main) {
  process.exit(consolidate({ cwd: process.cwd(), log: console }));
}
