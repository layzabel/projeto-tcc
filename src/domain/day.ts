// Dia atual: criação, derivados, virada do dia e retenção (data-model.md › Dia atual).

import { compareDates, daysBetween } from './dates';
import {
  HISTORY_MAX_DAYS,
  type CompleteDocument,
  type CurrentDay,
  type DailyRecord,
  type Settings,
} from './model';

export function createDay(date: string, settings: Settings): CurrentDay {
  return {
    date,
    usedSeconds: 0,
    limitMin: settings.dailyLimitMin,
    warningPlayed: false,
    supervisionInviteShown: false,
    closure: 'nao-iniciado',
    closureRequestedByAdult: false,
  };
}

export function limitSeconds(day: CurrentDay): number {
  return day.limitMin * 60;
}

export function remainingSeconds(day: CurrentDay): number {
  return Math.max(0, limitSeconds(day) - day.usedSeconds);
}

export function consumed(day: CurrentDay): number {
  return Math.min(1, day.usedSeconds / limitSeconds(day));
}

export function exhausted(day: CurrentDay): boolean {
  return day.usedSeconds >= limitSeconds(day);
}

/** Remove registros com mais de 30 dias em relação a hoje e mantém no máximo 30 (FR-044). */
export function applyRetention(history: readonly DailyRecord[], today: string): DailyRecord[] {
  return history
    .filter((r) => daysBetween(r.date, today) <= HISTORY_MAX_DAYS)
    .slice(-HISTORY_MAX_DAYS);
}

function archive(day: CurrentDay): DailyRecord {
  return {
    date: day.date,
    usedSeconds: day.usedSeconds,
    limitMin: day.limitMin,
    closureHappened: day.closure === 'concluido',
  };
}

/** Virada do dia: só quando hoje é posterior ao dia registrado (FR-018, FR-019). */
export function rollover(doc: CompleteDocument, today: string): CompleteDocument {
  if (compareDates(today, doc.currentDay.date) <= 0) {
    return doc;
  }
  return {
    ...doc,
    currentDay: createDay(today, doc.settings),
    history: applyRetention([...doc.history, archive(doc.currentDay)], today),
  };
}

/** Normalização de toda carga: retenção e tempo esgotado → encerramento em andamento. */
export function normalizeOnLoad(doc: CompleteDocument): CompleteDocument {
  const history = applyRetention(doc.history, doc.currentDay.date);
  const day = doc.currentDay;
  const closure = exhausted(day) && day.closure === 'nao-iniciado' ? 'em-andamento' : day.closure;
  if (history.length === doc.history.length && closure === day.closure) {
    return doc;
  }
  return { ...doc, history, currentDay: { ...day, closure } };
}
