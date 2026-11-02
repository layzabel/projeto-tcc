// Ajustes do painel e "Encerrar agora" (FR-017, FR-026, FR-035, FR-036).

import { isValidLimit, WARNING_MAX, WARNING_MIN } from './limits';
import type { CompleteDocument, CurrentDay, Settings } from './model';

export type Validation = { ok: true } | { ok: false; message: string };

const OK: Validation = { ok: true };

export const MESSAGES = {
  invalidLimit: 'Escolha um limite entre 15 e 60 minutos, de 5 em 5.',
  reduceWarningFirst: 'Reduza o aviso antes de escolher este limite',
  invalidWarning:
    'O aviso precisa ser de 1 a 15 minutos e menor que o limite de hoje e o de amanhã.',
} as const;

export function validateNewLimit(doc: CompleteDocument, limit: number): Validation {
  if (!isValidLimit(limit)) {
    return { ok: false, message: MESSAGES.invalidLimit };
  }
  if (doc.settings.warningMin >= limit) {
    return { ok: false, message: MESSAGES.reduceWarningFirst };
  }
  return OK;
}

export function validateWarning(doc: CompleteDocument, warning: number): Validation {
  const smallestLimit = Math.min(doc.currentDay.limitMin, doc.settings.dailyLimitMin);
  const inRange = Number.isInteger(warning) && warning >= WARNING_MIN && warning <= WARNING_MAX;
  return inRange && warning < smallestLimit ? OK : { ok: false, message: MESSAGES.invalidWarning };
}

/** Aplica ajustes; o limite novo vale só a partir do dia seguinte (currentDay não muda). */
export function applySettings(doc: CompleteDocument, patch: Partial<Settings>): CompleteDocument {
  return { ...doc, settings: { ...doc.settings, ...patch } };
}

/** "Encerrar agora" confirmado: o encerramento começa e o bloqueio vale até o dia seguinte. */
export function requestCloseNow(doc: CompleteDocument): CompleteDocument {
  if (doc.currentDay.closure === 'concluido') {
    return doc;
  }
  return {
    ...doc,
    currentDay: { ...doc.currentDay, closure: 'em-andamento', closureRequestedByAdult: true },
  };
}

export function dayStatus(day: CurrentDay): 'em uso' | 'encerrado' {
  return day.closure === 'concluido' ? 'encerrado' : 'em uso';
}
