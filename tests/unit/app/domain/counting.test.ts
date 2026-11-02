import { describe, expect, it } from 'vitest';
import {
  addUsed,
  drain,
  INITIAL_COUNTER,
  MAX_INTERVAL_MS,
  resume,
  SAVE_EVERY_SECONDS,
  shouldCount,
  tick,
  type CounterState,
} from '@/domain/counting';
import { makeDoc } from '../../../helpers/docs';

const base = { screen: 'mundo' as const, visible: true, exhausted: false, overlayOpen: false };

describe('shouldCount (FR-011, FR-012)', () => {
  it.each(['mundo', 'jogo', 'historia'] as const)('conta em %s visível', (screen) => {
    expect(shouldCount({ ...base, screen })).toBe(true);
  });

  it.each(['carregando', 'configuracao', 'encerramento', 'bloqueio'] as const)(
    'não conta em %s',
    (screen) => {
      expect(shouldCount({ ...base, screen })).toBe(false);
    },
  );

  it('não conta oculta, sem tempo ou com a área do adulto aberta', () => {
    expect(shouldCount({ ...base, visible: false })).toBe(false);
    expect(shouldCount({ ...base, exhausted: true })).toBe(false);
    expect(shouldCount({ ...base, overlayOpen: true })).toBe(false);
  });
});

describe('tick (R4, FR-013)', () => {
  it('constantes', () => {
    expect(MAX_INTERVAL_MS).toBe(5000);
    expect(SAVE_EVERY_SECONDS).toBe(5);
  });

  it('o primeiro tick só marca o instante; os seguintes somam o intervalo', () => {
    let s = tick(INITIAL_COUNTER, 1000);
    expect(s.msAccumulator).toBe(0);
    s = tick(s, 2000);
    s = tick(s, 3500);
    expect(s.msAccumulator).toBe(2500);
  });

  it('limita cada intervalo a 5 s e nunca soma intervalo negativo', () => {
    let s = tick(INITIAL_COUNTER, 0);
    s = tick(s, 2 * 60 * 60 * 1000);
    expect(s.msAccumulator).toBe(5000);
    s = tick(s, 1000);
    expect(s.msAccumulator).toBe(5000);
  });

  it('resume reinicia o último instante: o tempo oculto não entra', () => {
    let s = tick(INITIAL_COUNTER, 0);
    s = tick(s, 1000);
    s = resume(s);
    s = tick(s, 600_000);
    s = tick(s, 601_000);
    expect(s.msAccumulator).toBe(2000);
  });
});

describe('drain e addUsed (FR-015)', () => {
  it('drain transfere só segundos inteiros e guarda a fração', () => {
    const [s, seconds] = drain({ last: 0, msAccumulator: 3700 });
    expect(seconds).toBe(3);
    expect(s.msAccumulator).toBe(700);
  });

  it('addUsed soma, nunca diminui e limita a limitSeconds', () => {
    const day = makeDoc({ currentDay: { usedSeconds: 100, limitMin: 15 } }).currentDay;
    expect(addUsed(day, 5).usedSeconds).toBe(105);
    expect(addUsed(day, -50).usedSeconds).toBe(100);
    expect(addUsed(day, 10_000).usedSeconds).toBe(900);
  });
});

/** Simula ticks de 1 s em períodos visíveis e pausas sem tick, com um relógio monotônico. */
function simulate(periods: { visibleMs: number; pausedMs: number }[], jitter = 0) {
  let state: CounterState = INITIAL_COUNTER;
  let now = 0;
  let counted = 0;
  let visibleTotal = 0;
  for (const { visibleMs, pausedMs } of periods) {
    state = tick(resume(state), now);
    const end = now + visibleMs;
    while (now < end) {
      now = Math.min(end, now + 1000 + jitter);
      state = tick(state, now);
    }
    visibleTotal += visibleMs;
    now += pausedMs;
    const [next, seconds] = drain(state);
    state = next;
    counted += seconds;
  }
  return { counted, visibleSeconds: visibleTotal / 1000 };
}

describe('simulações (SC-002, SC-003)', () => {
  it('60 min de uso intercalados com pausas diferem ≤ 5 s do tempo visível', () => {
    const periods = Array.from({ length: 12 }, (_, i) => ({
      visibleMs: 5 * 60_000 + i * 137,
      pausedMs: (i % 3) * 120_000 + 30_000,
    }));
    const { counted, visibleSeconds } = simulate(periods, 3);
    expect(Math.abs(counted - visibleSeconds)).toBeLessThanOrEqual(5);
  });

  it.each([
    ['+2 h', 2 * 3600_000],
    ['−1 h', -3600_000],
    ['+24 h', 24 * 3600_000],
  ])('salto de relógio %s acrescenta ≤ 5 s e nunca reduz', (_, jump) => {
    let s = tick(INITIAL_COUNTER, 10_000);
    s = tick(s, 11_000);
    const before = s.msAccumulator;
    s = tick(s, 11_000 + jump);
    expect(s.msAccumulator - before).toBeLessThanOrEqual(5000);
    expect(s.msAccumulator).toBeGreaterThanOrEqual(before);
  });
});
