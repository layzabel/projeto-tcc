// Visões derivadas da aba Registro (FR-040, data-model › Visões derivadas). Dias sem registro
// aparecem como zero; nenhuma sequência de dias é calculada.

import { addDays } from './dates';
import type { CompleteDocument } from './model';

export type DayUsage = { date: string; minutes: number; seconds: number };

const WEEK = 7;
const MONTH = 30;

function secondsOn(doc: CompleteDocument, date: string): number {
  if (date === doc.currentDay.date) {
    return doc.currentDay.usedSeconds;
  }
  return doc.history.find((r) => r.date === date)?.usedSeconds ?? 0;
}

function usage(doc: CompleteDocument, date: string): DayUsage {
  const seconds = secondsOn(doc, date);
  return { date, minutes: Math.floor(seconds / 60), seconds };
}

/** Hoje − 6 até hoje, do mais antigo ao mais recente. */
export function last7(doc: CompleteDocument): DayUsage[] {
  const today = doc.currentDay.date;
  return Array.from({ length: WEEK }, (_, i) => usage(doc, addDays(today, i - (WEEK - 1))));
}

function weekSeconds(doc: CompleteDocument): number {
  return last7(doc).reduce((sum, d) => sum + d.seconds, 0);
}

/** Total da semana em minutos (arredondado). */
export function weekTotal(doc: CompleteDocument): number {
  return Math.round(weekSeconds(doc) / 60);
}

/** Média diária em minutos, sempre ÷ 7, com uma casa decimal. */
export function dailyAverage(doc: CompleteDocument): number {
  return Math.round((weekSeconds(doc) / WEEK / 60) * 10) / 10;
}

/** Quantidade de dias, entre os 7, com uso maior que zero. */
export function daysWithUse(doc: CompleteDocument): number {
  return last7(doc).filter((d) => d.seconds > 0).length;
}

/** Hoje até hoje − 29, do mais recente ao mais antigo. */
export function last30(doc: CompleteDocument): DayUsage[] {
  const today = doc.currentDay.date;
  return Array.from({ length: MONTH }, (_, i) => usage(doc, addDays(today, -i)));
}
