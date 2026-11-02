import type { Exec } from '../lib/exec.ts';

export const CCUSAGE_VERSION = '20.0.46';

export class CcusageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CcusageError';
  }
}

export type Session = {
  id: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  /** Texto do número exatamente como veio no JSON (sem passar por `number`). */
  cost: string;
  models: string[];
  lastActivity: string;
};

export type SessionTotals = Omit<Session, 'id'> & { ids: string[] };

export function ccusageArgs(id: string, version: string = CCUSAGE_VERSION): string[] {
  return ['-y', `ccusage@${version}`, 'session', '--json', '--offline', '--id', id];
}

export async function fetchSession(
  id: string,
  exec: Exec,
  version: string = CCUSAGE_VERSION,
): Promise<Session> {
  const result = await exec('npx', ccusageArgs(id, version), { capture: true });
  if (result.code !== 0) {
    throw new CcusageError(`ccusage falhou (código ${result.code}) para a sessão ${id}`);
  }
  const sessions = parseSessions(result.stdout);
  const session = sessions.find((s) => s.id === id);
  if (!session) {
    throw new CcusageError(`sessão ${id} não encontrada no ccusage`);
  }
  return session;
}

// --- leitura do JSON preservando o texto de totalCost ---------------------------------------

type Json = Record<string, unknown>;
type ReviverContext = { source?: string };

class RawCost {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function parseJson(raw: string): unknown {
  try {
    // O terceiro argumento do reviver (context.source) dá o texto original do número.
    const reviver = (key: string, value: unknown, context?: ReviverContext) =>
      key === 'totalCost' && typeof value === 'number' && context?.source
        ? new RawCost(context.source)
        : value;
    return JSON.parse(raw, reviver as (key: string, value: unknown) => unknown);
  } catch {
    throw new CcusageError('saída do ccusage não é JSON válido');
  }
}

function obj(value: unknown): Json {
  return typeof value === 'object' && value !== null ? (value as Json) : {};
}

function int(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 0;
}

function rawCost(value: unknown): string {
  if (!(value instanceof RawCost)) {
    throw new CcusageError('totalCost ausente na saída do ccusage');
  }
  return value.text;
}

function fromSingle(data: Json): Session {
  const entries = Array.isArray(data.entries) ? data.entries.map(obj) : [];
  const sum = (field: string) => entries.reduce((total, e) => total + int(e[field]), 0);
  const models = [...new Set(entries.map((e) => String(e.model ?? '')))].filter(Boolean);
  const timestamps = entries.map((e) => String(e.timestamp ?? '')).filter(Boolean);
  return {
    id: String(data.sessionId ?? ''),
    inputTokens: sum('inputTokens'),
    outputTokens: sum('outputTokens'),
    cacheCreationTokens: sum('cacheCreationTokens'),
    cacheReadTokens: sum('cacheReadTokens'),
    cost: rawCost(data.totalCost),
    models,
    lastActivity: latest(timestamps),
  };
}

function fromList(item: Json): Session {
  return {
    id: String(item.period ?? ''),
    inputTokens: int(item.inputTokens),
    outputTokens: int(item.outputTokens),
    cacheCreationTokens: int(item.cacheCreationTokens),
    cacheReadTokens: int(item.cacheReadTokens),
    cost: rawCost(item.totalCost),
    models: Array.isArray(item.modelsUsed) ? item.modelsUsed.map(String) : [],
    lastActivity: String(obj(item.metadata).lastActivity ?? ''),
  };
}

function tokens(s: Session): number {
  return s.inputTokens + s.outputTokens + s.cacheCreationTokens + s.cacheReadTokens;
}

function validate(session: Session): Session {
  if (session.id === '' || session.lastActivity === '') {
    throw new CcusageError('sessão sem ID ou sem data na saída do ccusage');
  }
  if (Number(session.cost) === 0 && tokens(session) > 0) {
    throw new CcusageError(
      `sessão ${session.id} com custo 0 e ${tokens(session)} tokens: modelo sem preço na tabela do ccusage ${CCUSAGE_VERSION}`,
    );
  }
  return session;
}

/**
 * Aceita a saída de `session --json --id <id>` (objeto com `entries`) e a de
 * `session --json` (objeto com a lista `session`).
 */
export function parseSessions(raw: string): Session[] {
  const data = parseJson(raw);
  if (data === null) {
    throw new CcusageError('ccusage não encontrou a sessão (saída "null")');
  }
  const root = obj(data);
  const sessions = Array.isArray(root.session)
    ? root.session.map((item) => fromList(obj(item)))
    : [fromSingle(root)];
  if (sessions.length === 0) {
    throw new CcusageError('ccusage devolveu zero sessões');
  }
  return sessions.map(validate);
}

// --- soma decimal exata ----------------------------------------------------------------------

type Decimal = { digits: bigint; scale: number };

function toDecimal(text: string): Decimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text.trim());
  if (!match) {
    throw new CcusageError(`custo inválido: ${text}`);
  }
  const [, sign = '', whole = '0', fraction = '', exponent = '0'] = match;
  const scale = fraction.length - Number(exponent);
  const digits = BigInt(`${sign}${whole}${fraction}`);
  return scale >= 0 ? { digits, scale } : { digits: digits * 10n ** BigInt(-scale), scale: 0 };
}

function formatDecimal({ digits, scale }: Decimal): string {
  const negative = digits < 0n;
  const text = (negative ? -digits : digits).toString().padStart(scale + 1, '0');
  const body = scale === 0 ? text : `${text.slice(0, -scale)}.${text.slice(-scale)}`;
  return negative ? `-${body}` : body;
}

export function sumDecimals(values: readonly string[]): string {
  if (values.length === 1) {
    return values[0] as string;
  }
  const decimals = values.map(toDecimal);
  const scale = Math.max(0, ...decimals.map((d) => d.scale));
  const digits = decimals.reduce(
    (total, d) => total + d.digits * 10n ** BigInt(scale - d.scale),
    0n,
  );
  return formatDecimal({ digits, scale });
}

function latest(values: readonly string[]): string {
  return values.reduce((max, v) => (Date.parse(v) > Date.parse(max || v) ? v : max || v), '');
}

export function sumSessions(sessions: readonly Session[]): SessionTotals {
  if (sessions.length === 0) {
    throw new CcusageError('nenhuma sessão para somar');
  }
  const sum = (pick: (s: Session) => number) => sessions.reduce((t, s) => t + pick(s), 0);
  return {
    ids: sessions.map((s) => s.id),
    inputTokens: sum((s) => s.inputTokens),
    outputTokens: sum((s) => s.outputTokens),
    cacheCreationTokens: sum((s) => s.cacheCreationTokens),
    cacheReadTokens: sum((s) => s.cacheReadTokens),
    cost: sumDecimals(sessions.map((s) => s.cost)),
    models: [...new Set(sessions.flatMap((s) => s.models))],
    lastActivity: new Date(latest(sessions.map((s) => s.lastActivity))).toISOString(),
  };
}
