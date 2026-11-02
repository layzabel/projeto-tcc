// Formato do documento gravado e saneamento de toda leitura (contracts/storage-schema.md).

import { exhausted } from '../domain/day';
import { isValidDate } from '../domain/dates';
import { sanitizeLimit, sanitizeWarning, DEFAULT_WARNING } from '../domain/limits';
import { normalizeNickname } from '../domain/setup';
import {
  CLOSURE_STYLES,
  PBKDF2_ITERATIONS,
  type ClosureState,
  type ClosureStyle,
  type CompleteDocument,
  type Consent,
  type Credential,
  type CurrentDay,
  type DailyRecord,
  type Profile,
  type Settings,
  type StoredDocument,
} from '../domain/model';

export type {
  ClosureState,
  ClosureStyle,
  CompleteDocument,
  Consent,
  Credential,
  CurrentDay,
  DailyRecord,
  PendingDocument,
  Profile,
  Settings,
  StoredDocument,
} from '../domain/model';

export type SanitizeResult = { doc: StoredDocument | null; changed: boolean };

type Obj = Record<string, unknown>;

const SALT_RE = /^[A-Za-z0-9+/]{22}==$/;
const HASH_RE = /^[A-Za-z0-9+/]{43}=$/;
const CLOSURE_STATES: readonly ClosureState[] = ['nao-iniciado', 'em-andamento', 'concluido'];

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function seconds(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, Math.floor(value)));
}

function sanitizeConsent(value: unknown): Consent | null {
  if (
    !isObj(value) ||
    typeof value.acceptedAt !== 'string' ||
    typeof value.textVersion !== 'string'
  ) {
    return null;
  }
  if (!Number.isFinite(Date.parse(value.acceptedAt)) || value.textVersion === '') {
    return null;
  }
  return { acceptedAt: value.acceptedAt, textVersion: value.textVersion };
}

function sanitizeCredential(value: unknown): Credential | null {
  if (!isObj(value) || value.algorithm !== 'PBKDF2-SHA-256') {
    return null;
  }
  if (value.iterations !== PBKDF2_ITERATIONS) {
    return null;
  }
  if (typeof value.salt !== 'string' || typeof value.hash !== 'string') {
    return null;
  }
  if (!SALT_RE.test(value.salt) || !HASH_RE.test(value.hash)) {
    return null;
  }
  return {
    algorithm: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: value.salt,
    hash: value.hash,
  };
}

function sanitizeClosure(value: unknown, isExhausted: boolean): ClosureState {
  if (CLOSURE_STATES.includes(value as ClosureState)) {
    return value as ClosureState;
  }
  return isExhausted ? 'em-andamento' : 'nao-iniciado';
}

function sanitizeDay(value: unknown): CurrentDay | null {
  if (!isObj(value) || !isValidDate(value.date)) {
    return null;
  }
  const limitMin = sanitizeLimit(value.limitMin);
  const usedSeconds = seconds(value.usedSeconds, limitMin * 60);
  const base = { date: value.date, usedSeconds, limitMin };
  return {
    ...base,
    warningPlayed: bool(value.warningPlayed, false),
    supervisionInviteShown: bool(value.supervisionInviteShown, false),
    closure: sanitizeClosure(value.closure, exhausted({ ...base } as CurrentDay)),
    closureRequestedByAdult: bool(value.closureRequestedByAdult, false),
  };
}

function sanitizeSettings(value: unknown, day: CurrentDay): Settings | null {
  if (!isObj(value)) {
    return null;
  }
  const dailyLimitMin = sanitizeLimit(value.dailyLimitMin);
  const style = value.closureStyle as ClosureStyle;
  return {
    dailyLimitMin,
    warningMin: sanitizeWarning(value.warningMin ?? DEFAULT_WARNING, day.limitMin, dailyLimitMin),
    closureStyle: CLOSURE_STYLES.includes(style) ? style : 'respiracao',
    sounds: bool(value.sounds, true),
    voice: bool(value.voice, true),
    reducedMotion: bool(value.reducedMotion, false),
  };
}

function sanitizeRecord(value: unknown): DailyRecord | null {
  if (!isObj(value) || !isValidDate(value.date) || typeof value.usedSeconds !== 'number') {
    return null;
  }
  if (!Number.isFinite(value.usedSeconds)) {
    return null;
  }
  return {
    date: value.date,
    usedSeconds: Math.max(0, Math.floor(value.usedSeconds)),
    limitMin: sanitizeLimit(value.limitMin),
    closureHappened: bool(value.closureHappened, false),
  };
}

function sanitizeHistory(value: unknown, today: string): DailyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const byDate = new Map<string, DailyRecord>();
  for (const item of value) {
    const record = sanitizeRecord(item);
    if (record && record.date < today && !byDate.has(record.date)) {
      byDate.set(record.date, record);
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

function sanitizeProfile(value: unknown): Profile {
  return { nickname: normalizeNickname(isObj(value) ? value.nickname : null) };
}

function sanitizeComplete(input: Obj, consent: Consent): CompleteDocument | null {
  const credential = sanitizeCredential(input.credential);
  const currentDay = sanitizeDay(input.currentDay);
  if (!credential || !currentDay) {
    return null;
  }
  const settings = sanitizeSettings(input.settings, currentDay);
  if (!settings) {
    return null;
  }
  return {
    schemaVersion: 1,
    consent,
    setupCompleted: true,
    profile: sanitizeProfile(input.profile),
    settings,
    credential,
    currentDay,
    history: sanitizeHistory(input.history, currentDay.date),
  };
}

function sanitizeDocument(input: unknown): StoredDocument | null {
  if (!isObj(input) || input.schemaVersion !== 1) {
    return null;
  }
  const consent = sanitizeConsent(input.consent);
  if (!consent) {
    return null;
  }
  if (input.setupCompleted === false) {
    return { schemaVersion: 1, consent, setupCompleted: false };
  }
  return input.setupCompleted === true ? sanitizeComplete(input, consent) : null;
}

/** Saneia um valor lido; changed indica se o resultado difere do que foi lido. */
export function sanitize(input: unknown): SanitizeResult {
  const doc = sanitizeDocument(input);
  return { doc, changed: doc !== null && JSON.stringify(doc) !== JSON.stringify(input) };
}

/** Lê o texto gravado: ausente ou JSON inválido → sem documento. */
export function parseDocument(text: string | null): SanitizeResult {
  if (text === null || text === '') {
    return { doc: null, changed: false };
  }
  try {
    return sanitize(JSON.parse(text));
  } catch {
    return { doc: null, changed: false };
  }
}
