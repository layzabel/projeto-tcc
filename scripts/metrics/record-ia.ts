import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ArgsError, parseArgs, type CliArgs } from '../lib/args.ts';
import { run, type Exec } from '../lib/exec.ts';
import { metricsFilePath, resolveFeatureDir } from '../lib/feature.ts';
import { CCUSAGE_VERSION, fetchSession, sumSessions, type Session } from './ccusage.ts';
import { appendRows, readRows, type Row, type TableName } from './table.ts';
import { activeSessionId, listPrompts, readTranscript, transcriptDir } from './transcript.ts';

export const EXIT = {
  correcoes: 20,
  sessao: 21,
  ccusage: 22,
  argumento: 23,
  inesperado: 1,
} as const;

export type RecordDeps = {
  env: Record<string, string | undefined>;
  cwd: string;
  home: string;
  exec: Exec;
  append: (file: string, table: TableName, rows: readonly Row[]) => void;
  log: { log: (m: string) => void; error: (m: string) => void };
};

export class RecordError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'RecordError';
    this.code = code;
  }
}

const STAGES = new Set([
  'constitution',
  'specify',
  'clarify',
  'plan',
  'tasks',
  'analyze',
  'implement',
]);
const CORRECAO = /^correcao-[1-9]\d*$/;
const PROMPT_PREVIEW = 500;

function refuse(message: string): never {
  throw new RecordError(EXIT.argumento, `METRICS FALHOU: ${message}`);
}

function validStage(name: string): boolean {
  return STAGES.has(name) || CORRECAO.test(name);
}

export function validateEtapa(args: CliArgs): string {
  const etapa = args.etapa?.trim() ?? '';
  const parts = etapa.split('+');
  if (etapa === 'registro') {
    return etapa;
  }
  if (etapa === '' || !parts.every(validStage)) {
    refuse(`--etapa inválida: "${etapa}"`);
  }
  if (parts.length > 1 && !args.retroativo && !args.obs?.trim()) {
    refuse('etapa agregada sem --retroativo exige --obs explicando o desvio');
  }
  return etapa;
}

function validateObs(obs: string | undefined): string {
  if (obs !== undefined && /[|\r\n]/.test(obs)) {
    refuse('--obs não pode conter "|" nem quebra de linha');
  }
  return obs?.trim() ?? '';
}

function validateSessoes(ids: readonly string[]): readonly string[] {
  if (ids.length === 0) {
    refuse('--sessao é obrigatório');
  }
  if (new Set(ids).size !== ids.length) {
    refuse('--sessao contém IDs repetidos');
  }
  return ids;
}

export function validateCorrecoes(etapa: string, correcoes: number): void {
  if (etapa === 'registro' && correcoes !== 0) {
    refuse('etapa registro exige --correcoes 0');
  }
  if (etapa.split('+').some((part) => CORRECAO.test(part)) && correcoes < 1) {
    refuse(`etapa ${etapa} exige --correcoes ≥ 1`);
  }
}

function checkSessions(ids: readonly string[], dir: string, previous: readonly Row[]): void {
  const active = activeSessionId(dir);
  if (active !== undefined && ids.includes(active)) {
    throw new RecordError(
      EXIT.sessao,
      `METRICS FALHOU: a sessão ${active} é a sessão ativa; registre-a numa sessão de registro posterior`,
    );
  }
  const registered = new Set(previous.flatMap((row) => (row.sessoes ?? '').split(',')));
  const repeated = ids.filter((id) => registered.has(id));
  if (repeated.length > 0) {
    throw new RecordError(
      EXIT.sessao,
      `METRICS FALHOU: sessão já registrada nesta feature: ${repeated.join(', ')}`,
    );
  }
}

async function fetchAll(ids: readonly string[], exec: Exec): Promise<Session[]> {
  const sessions: Session[] = [];
  for (const id of ids) {
    try {
      sessions.push(await fetchSession(id, exec));
    } catch (error) {
      throw new RecordError(EXIT.ccusage, `METRICS FALHOU: ${(error as Error).message}`);
    }
  }
  return sessions;
}

function readPrompts(ids: readonly string[], dir: string): string[] {
  try {
    return ids.flatMap((id) => listPrompts(readTranscript(dir, id)));
  } catch (error) {
    throw new RecordError(EXIT.ccusage, `METRICS FALHOU: ${(error as Error).message}`);
  }
}

function askCorrecoes(deps: RecordDeps, prompts: readonly string[]): never {
  deps.log.log(`Prompts encontrados (${prompts.length}):`);
  prompts.forEach((prompt, index) => {
    const oneLine = prompt.replaceAll(/\s+/g, ' ');
    const preview =
      oneLine.length > PROMPT_PREVIEW ? oneLine.slice(0, PROMPT_PREVIEW) + '…' : oneLine;
    deps.log.log(`${index + 1}. ${preview}`);
  });
  throw new RecordError(
    EXIT.correcoes,
    'METRICS: informe o número de prompts de correção com --correcoes <n> e rode de novo (FR-011c)',
  );
}

function existingRows(file: string): Row[] {
  return fs.existsSync(file) ? readRows(fs.readFileSync(file, 'utf8'), 'ia') : [];
}

export async function recordIa(argv: string[], deps: RecordDeps): Promise<number> {
  try {
    const args = parseArgs(argv);
    const etapa = validateEtapa(args);
    const observacao = validateObs(args.obs);
    const ids = validateSessoes(args.sessao);
    const featureDir = resolveFeatureDir({ feature: args.feature, env: deps.env, cwd: deps.cwd });
    const file = metricsFilePath(featureDir);
    const dir = transcriptDir(deps.cwd, deps.home);
    checkSessions(ids, dir, existingRows(file));
    const totals = sumSessions(await fetchAll(ids, deps.exec));
    const prompts = readPrompts(ids, dir);
    if (args.correcoes === undefined) {
      askCorrecoes(deps, prompts);
    }
    validateCorrecoes(etapa, args.correcoes);
    if (prompts.length < 1) {
      throw new RecordError(
        EXIT.ccusage,
        'METRICS FALHOU: nenhum prompt encontrado na transcrição',
      );
    }
    const row: Row = {
      data_hora: totals.lastActivity,
      etapa,
      modelo: totals.models.join('+'),
      tokens_entrada: String(totals.inputTokens),
      tokens_saida: String(totals.outputTokens),
      tokens_cache_escrita: String(totals.cacheCreationTokens),
      tokens_cache_leitura: String(totals.cacheReadTokens),
      custo_usd: totals.cost,
      prompts: String(prompts.length),
      rodadas_correcao: String(args.correcoes),
      versao_ccusage: CCUSAGE_VERSION,
      sessoes: totals.ids.join(','),
      tipo: args.retroativo ? 'retroativo' : 'no momento',
      observacao,
    };
    deps.append(file, 'ia', [row]);
    deps.log.log(`METRICS OK: 1 linha gravada em ${path.relative(deps.cwd, file)}`);
    deps.log.log(Object.values(row).join(' | '));
    return 0;
  } catch (error) {
    return fail(deps, error);
  }
}

function fail(deps: RecordDeps, error: unknown): number {
  if (error instanceof RecordError) {
    deps.log.error(error.message);
    return error.code;
  }
  const code = error instanceof ArgsError ? EXIT.argumento : EXIT.inesperado;
  deps.log.error(`METRICS FALHOU: ${(error as Error).message}`);
  return code;
}

if (import.meta.main) {
  process.exit(
    await recordIa(process.argv.slice(2), {
      env: process.env,
      cwd: process.cwd(),
      home: os.homedir(),
      exec: run,
      append: (file, table, rows) => appendRows(file, table, rows),
      log: console,
    }),
  );
}
