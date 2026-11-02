import { describe, expect, it } from 'vitest';
import {
  applyRetention,
  consumed,
  createDay,
  exhausted,
  limitSeconds,
  normalizeOnLoad,
  remainingSeconds,
  rollover,
} from '@/domain/day';
import { addDays } from '@/domain/dates';
import type { DailyRecord } from '@/domain/model';
import { makeDoc } from '../../../helpers/docs';

describe('createDay', () => {
  it('cria o dia com tempo zero, limite dos ajustes e flags falsas', () => {
    const { settings } = makeDoc({ settings: { dailyLimitMin: 30 } });
    expect(createDay('2026-11-02', settings)).toEqual({
      date: '2026-11-02',
      usedSeconds: 0,
      limitMin: 30,
      warningPlayed: false,
      supervisionInviteShown: false,
      closure: 'nao-iniciado',
      closureRequestedByAdult: false,
    });
  });
});

describe('derivados', () => {
  it('limitSeconds, remainingSeconds, consumed, exhausted', () => {
    const day = makeDoc({ currentDay: { usedSeconds: 1500, limitMin: 60 } }).currentDay;
    expect(limitSeconds(day)).toBe(3600);
    expect(remainingSeconds(day)).toBe(2100);
    expect(consumed(day)).toBeCloseTo(1500 / 3600);
    expect(exhausted(day)).toBe(false);
    const full = { ...day, usedSeconds: 3600 };
    expect(remainingSeconds(full)).toBe(0);
    expect(consumed(full)).toBe(1);
    expect(exhausted(full)).toBe(true);
  });
});

describe('rollover (FR-018, FR-019)', () => {
  it('hoje maior: arquiva o dia e cria um novo com o limite de amanhã', () => {
    const doc = makeDoc({
      settings: { dailyLimitMin: 30 },
      currentDay: { usedSeconds: 3600, limitMin: 60, closure: 'concluido', warningPlayed: true },
    });
    const next = rollover(doc, '2026-11-02');
    expect(next.history.at(-1)).toEqual({
      date: '2026-11-01',
      usedSeconds: 3600,
      limitMin: 60,
      closureHappened: true,
    });
    expect(next.currentDay).toEqual(createDay('2026-11-02', doc.settings));
    expect(next.currentDay.limitMin).toBe(30);
  });

  it('encerramento não concluído é arquivado como não acontecido', () => {
    const doc = makeDoc({ currentDay: { closure: 'em-andamento' } });
    expect(rollover(doc, '2026-11-05').history.at(-1)?.closureHappened).toBe(false);
  });

  it('hoje igual: nada muda (mesmo objeto)', () => {
    const doc = makeDoc();
    expect(rollover(doc, '2026-11-01')).toBe(doc);
  });

  it('hoje menor (relógio atrasado): nada muda', () => {
    const doc = makeDoc();
    expect(rollover(doc, '2026-10-20')).toBe(doc);
  });

  it('aplica a retenção na virada', () => {
    const history: DailyRecord[] = [
      { date: '2026-10-01', usedSeconds: 10, limitMin: 60, closureHappened: false },
      { date: '2026-10-03', usedSeconds: 10, limitMin: 60, closureHappened: false },
    ];
    const next = rollover(makeDoc({ history }), '2026-11-02');
    expect(next.history.map((r) => r.date)).toEqual(['2026-10-03', '2026-11-01']);
  });
});

describe('applyRetention (FR-044)', () => {
  it('remove registros com idade > 30 dias e deixa no máximo 30', () => {
    const today = '2026-11-01';
    const history: DailyRecord[] = Array.from({ length: 40 }, (_, i) => ({
      date: addDays(today, -40 + i),
      usedSeconds: i,
      limitMin: 60,
      closureHappened: false,
    }));
    const kept = applyRetention(history, today);
    expect(kept).toHaveLength(30);
    expect(kept[0]?.date).toBe(addDays(today, -30));
    expect(kept.at(-1)?.date).toBe(addDays(today, -1));
  });
});

describe('normalizeOnLoad', () => {
  it('aplica a retenção numa carga no mesmo dia, sem virada', () => {
    const doc = makeDoc({
      history: [
        { date: '2026-09-01', usedSeconds: 10, limitMin: 60, closureHappened: false },
        { date: '2026-10-30', usedSeconds: 10, limitMin: 60, closureHappened: false },
      ],
    });
    expect(normalizeOnLoad(doc).history.map((r) => r.date)).toEqual(['2026-10-30']);
  });

  it('tempo esgotado com closure nao-iniciado → em-andamento', () => {
    const doc = makeDoc({ currentDay: { usedSeconds: 3600, limitMin: 60 } });
    expect(normalizeOnLoad(doc).currentDay.closure).toBe('em-andamento');
  });

  it('não altera um documento já normalizado (mesmo objeto)', () => {
    const doc = makeDoc();
    expect(normalizeOnLoad(doc)).toBe(doc);
  });

  it('não reabre um dia concluído', () => {
    const doc = makeDoc({ currentDay: { usedSeconds: 3600, closure: 'concluido' } });
    expect(normalizeOnLoad(doc).currentDay.closure).toBe('concluido');
  });
});
