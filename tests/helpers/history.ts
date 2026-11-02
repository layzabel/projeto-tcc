import { addDays } from '../../src/domain/dates';
import type { DailyRecord } from '../../src/domain/model';

/**
 * Histórico conhecido de 40 dias antes de `today`: o dia de i dias atrás tem i minutos de uso,
 * exceto 3 dias atrás (uso zero) e 5 dias atrás (sem registro).
 */
export function knownHistory(today: string): DailyRecord[] {
  const records: DailyRecord[] = [];
  for (let ago = 40; ago >= 1; ago -= 1) {
    if (ago === 5) {
      continue;
    }
    records.push({
      date: addDays(today, -ago),
      usedSeconds: ago === 3 ? 0 : ago * 60,
      limitMin: 60,
      closureHappened: ago % 2 === 0,
    });
  }
  return records;
}

/** Hoje com 25 min usados: últimos 7 (do mais antigo ao mais recente). */
export const EXPECTED_LAST7 = [6, 0, 4, 0, 2, 1, 25];
export const EXPECTED_WEEK_TOTAL = 38;
export const EXPECTED_AVERAGE = 5.4;
export const EXPECTED_DAYS_WITH_USE = 5;
