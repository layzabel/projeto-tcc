import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import { normalizeOnLoad } from '@/domain/day';
import { dailyAverage, daysWithUse, last30, last7, weekTotal } from '@/domain/history';
import { makeDoc } from '../../../helpers/docs';
import {
  EXPECTED_AVERAGE,
  EXPECTED_DAYS_WITH_USE,
  EXPECTED_LAST7,
  EXPECTED_WEEK_TOTAL,
  knownHistory,
} from '../../../helpers/history';

const TODAY = '2026-11-01';
const doc = normalizeOnLoad(
  makeDoc({ currentDay: { date: TODAY, usedSeconds: 25 * 60 }, history: knownHistory(TODAY) }),
);

describe('visões da aba Registro (FR-040, SC-009)', () => {
  it('a carga deixa só os últimos 30 dias', () => {
    expect(doc.history.length).toBeLessThanOrEqual(30);
    expect(doc.history[0]!.date).toBe(addDays(TODAY, -30));
  });

  it('last7: hoje − 6 até hoje, com o dia atual e zero nos dias ausentes', () => {
    const bars = last7(doc);
    expect(bars.map((b) => b.date)).toEqual(
      Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 6)),
    );
    expect(bars.map((b) => b.minutes)).toEqual(EXPECTED_LAST7);
  });

  it('total da semana, média ÷ 7 com uma casa e dias com uso', () => {
    expect(weekTotal(doc)).toBe(EXPECTED_WEEK_TOTAL);
    expect(dailyAverage(doc)).toBe(EXPECTED_AVERAGE);
    expect(daysWithUse(doc)).toBe(EXPECTED_DAYS_WITH_USE);
  });

  it('dia atual em minutos por floor; total e média por round', () => {
    const partial = makeDoc({
      currentDay: { date: TODAY, usedSeconds: 25 * 60 + 40 },
      history: [],
    });
    expect(last7(partial).at(-1)!.minutes).toBe(25);
    expect(weekTotal(partial)).toBe(26);
    expect(dailyAverage(partial)).toBeCloseTo(3.7, 10);
  });

  it('média divide sempre por 7, mesmo sem nenhum histórico', () => {
    const fresh = makeDoc({ currentDay: { date: TODAY, usedSeconds: 7 * 60 }, history: [] });
    expect(dailyAverage(fresh)).toBe(1);
    expect(daysWithUse(fresh)).toBe(1);
    expect(weekTotal(fresh)).toBe(7);
  });

  it('last30: hoje − 29 até hoje, do mais recente ao mais antigo', () => {
    const rows = last30(doc);
    expect(rows).toHaveLength(30);
    expect(rows[0]).toEqual({ date: TODAY, minutes: 25, seconds: 25 * 60 });
    expect(rows.at(-1)!.date).toBe(addDays(TODAY, -29));
    expect(rows.at(-1)!.minutes).toBe(29);
    expect(rows.find((r) => r.date === addDays(TODAY, -5))!.minutes).toBe(0);
    expect(rows.find((r) => r.date === addDays(TODAY, -3))!.minutes).toBe(0);
  });
});
