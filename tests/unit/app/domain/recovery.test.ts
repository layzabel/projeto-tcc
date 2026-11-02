import { describe, expect, it } from 'vitest';
import { checkAnswer, newChallenge } from '@/domain/recovery';
import { random, sequenceSource } from '@/platform/random';

describe('recuperação por multiplicação (FR-032)', () => {
  it('fatores de 12 a 19 e de 3 a 9', () => {
    expect(newChallenge(sequenceSource([0, 0]))).toEqual({ a: 12, b: 3 });
    expect(newChallenge(sequenceSource([0.9999, 0.9999]))).toEqual({ a: 19, b: 9 });
  });

  it('a distribuição cobre todos os fatores', () => {
    const steps = Array.from({ length: 8 }, (_, i) => (i + 0.5) / 8);
    const as = new Set(steps.map((v) => newChallenge(sequenceSource([v, 0])).a));
    const bs = new Set(
      Array.from({ length: 7 }, (_, i) => newChallenge(sequenceSource([0, (i + 0.5) / 7])).b),
    );
    expect([...as].sort((x, y) => x - y)).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
    expect([...bs].sort((x, y) => x - y)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('com a fonte real os fatores ficam nas faixas', () => {
    for (let i = 0; i < 100; i += 1) {
      const { a, b } = newChallenge(random);
      expect(a).toBeGreaterThanOrEqual(12);
      expect(a).toBeLessThanOrEqual(19);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
    }
  });

  it('checkAnswer aceita só o produto exato', () => {
    const challenge = { a: 14, b: 6 };
    expect(checkAnswer(challenge, '84')).toBe(true);
    expect(checkAnswer(challenge, ' 84 ')).toBe(true);
    expect(checkAnswer(challenge, '85')).toBe(false);
    expect(checkAnswer(challenge, '84.0')).toBe(false);
    expect(checkAnswer(challenge, '')).toBe(false);
    expect(checkAnswer(challenge, 'oitenta')).toBe(false);
  });
});
