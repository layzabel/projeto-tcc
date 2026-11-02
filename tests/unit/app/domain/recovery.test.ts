import { describe, expect, it } from 'vitest';
import { checkAnswer, newChallenge, RECOVERY_MAX, RECOVERY_MIN } from '@/domain/recovery';
import { random, sequenceSource } from '@/platform/random';

const ALL = Array.from({ length: 30 }, (_, i) => 20 + i);

describe('recuperação por soma (FR-032)', () => {
  it('parcelas de 20 a 49, inclusive', () => {
    expect([RECOVERY_MIN, RECOVERY_MAX]).toEqual([20, 49]);
    expect(newChallenge(sequenceSource([0, 0]))).toEqual({ a: 20, b: 20 });
    expect(newChallenge(sequenceSource([0.9999, 0.9999]))).toEqual({ a: 49, b: 49 });
  });

  it('a distribuição cobre todas as parcelas nas duas posições', () => {
    const middles = ALL.map((_, i) => (i + 0.5) / 30);
    const as = new Set(middles.map((v) => newChallenge(sequenceSource([v, 0])).a));
    const bs = new Set(middles.map((v) => newChallenge(sequenceSource([0, v])).b));
    expect([...as].sort((x, y) => x - y)).toEqual(ALL);
    expect([...bs].sort((x, y) => x - y)).toEqual(ALL);
  });

  it('com a fonte real as parcelas ficam na faixa', () => {
    for (let i = 0; i < 200; i += 1) {
      const { a, b } = newChallenge(random);
      for (const v of [a, b]) {
        expect(v).toBeGreaterThanOrEqual(20);
        expect(v).toBeLessThanOrEqual(49);
      }
    }
  });

  it('checkAnswer aceita só a soma exata', () => {
    const challenge = { a: 37, b: 48 };
    expect(checkAnswer(challenge, '85')).toBe(true);
    expect(checkAnswer(challenge, ' 85 ')).toBe(true);
    expect(checkAnswer(challenge, '86')).toBe(false);
    expect(checkAnswer(challenge, String(37 * 48))).toBe(false);
    expect(checkAnswer(challenge, '85.0')).toBe(false);
    expect(checkAnswer(challenge, '')).toBe(false);
    expect(checkAnswer(challenge, 'oitenta e cinco')).toBe(false);
  });
});
