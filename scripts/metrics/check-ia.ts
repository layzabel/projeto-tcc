import fs from 'node:fs';
import path from 'node:path';
import { run, type Exec } from '../lib/exec.ts';
import { fetchSession, sumSessions, type SessionTotals } from './ccusage.ts';
import { readRows, type Row } from './table.ts';

export const EXIT_DIVERGENCIA = 30;

export type CheckDeps = {
  cwd: string;
  exec: Exec;
  log: { log: (m: string) => void; error: (m: string) => void };
};

const COMPARED: ReadonlyArray<[keyof Row & string, (t: SessionTotals) => string]> = [
  ['tokens_entrada', (t) => String(t.inputTokens)],
  ['tokens_saida', (t) => String(t.outputTokens)],
  ['tokens_cache_escrita', (t) => String(t.cacheCreationTokens)],
  ['tokens_cache_leitura', (t) => String(t.cacheReadTokens)],
  ['custo_usd', (t) => t.cost],
];

export function metricsFiles(cwd: string): Array<{ feature: string; file: string }> {
  const specs = path.join(cwd, 'specs');
  if (!fs.existsSync(specs)) {
    return [];
  }
  return fs
    .readdirSync(specs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ feature: entry.name, file: path.join(specs, entry.name, 'metricas-ia.md') }))
    .filter(({ file }) => fs.existsSync(file))
    .sort((a, b) => a.feature.localeCompare(b.feature, 'en'));
}

async function checkRow(row: Row, exec: Exec): Promise<Array<[string, string, string]>> {
  const ids = (row.sessoes ?? '').split(',').filter(Boolean);
  try {
    const sessions = [];
    for (const id of ids) {
      sessions.push(await fetchSession(id, exec, row.versao_ccusage));
    }
    const totals = sumSessions(sessions);
    return COMPARED.flatMap(([column, pick]) => {
      const expected = pick(totals);
      const actual = row[column] ?? '';
      return expected === actual ? [] : [[column, expected, actual] as [string, string, string]];
    });
  } catch (error) {
    return [['sessoes', `ccusage falhou: ${(error as Error).message}`, row.sessoes ?? '']];
  }
}

export async function checkIa(deps: CheckDeps): Promise<number> {
  let total = 0;
  let ok = 0;
  for (const { feature, file } of metricsFiles(deps.cwd)) {
    let rows: Row[];
    try {
      rows = readRows(fs.readFileSync(file, 'utf8'), 'ia');
    } catch (error) {
      deps.log.error(
        `DIVERGÊNCIA feature=${feature}: arquivo fora do formato (${(error as Error).message})`,
      );
      return EXIT_DIVERGENCIA;
    }
    for (const [index, row] of rows.entries()) {
      total++;
      const diffs = await checkRow(row, deps.exec);
      for (const [column, expected, actual] of diffs) {
        deps.log.error(
          `DIVERGÊNCIA feature=${feature} linha=${index + 1} coluna=${column} esperado=${expected} obtido=${actual}`,
        );
      }
      ok += diffs.length === 0 ? 1 : 0;
    }
  }
  if (ok !== total) {
    deps.log.error(`METRICS CHECK FALHOU: ${ok}/${total} linhas idênticas`);
    return EXIT_DIVERGENCIA;
  }
  deps.log.log(`METRICS CHECK OK: ${ok}/${total} linhas idênticas`);
  return 0;
}

if (import.meta.main) {
  process.exit(await checkIa({ cwd: process.cwd(), exec: run, log: console }));
}
