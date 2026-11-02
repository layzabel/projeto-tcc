import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMIT,
  DEFAULT_WARNING,
  LIMIT_OPTIONS,
  sanitizeLimit,
  sanitizeWarning,
} from '@/domain/limits';

describe('sanitizeLimit (FR-016, SC-005)', () => {
  it.each([
    [0, 15],
    [14, 15],
    [17, 15],
    [18, 20],
    [45, 45],
    [61, 60],
    [999, 60],
    [-30, 15],
    [37.4, 35],
  ])('%s → %s', (input, expected) => {
    expect(sanitizeLimit(input)).toBe(expected);
  });

  it.each(['abc', '30', null, undefined, Number.NaN, Infinity, {}])(
    'não numérico %s → 60',
    (input) => {
      expect(sanitizeLimit(input)).toBe(60);
    },
  );

  it('nunca fica fora de 15..60', () => {
    for (let v = -100; v <= 200; v += 0.5) {
      const r = sanitizeLimit(v);
      expect(r).toBeGreaterThanOrEqual(15);
      expect(r).toBeLessThanOrEqual(60);
      expect(r % 5).toBe(0);
    }
  });
});

describe('sanitizeWarning (FR-036)', () => {
  it('mantém valores válidos', () => {
    expect(sanitizeWarning(5, 60, 60)).toBe(5);
    expect(sanitizeWarning(15, 60, 60)).toBe(15);
    expect(sanitizeWarning(1, 15, 15)).toBe(1);
  });

  it('limita a 1..15 e abaixo do menor limite', () => {
    expect(sanitizeWarning(0, 60, 60)).toBe(1);
    expect(sanitizeWarning(-4, 60, 60)).toBe(1);
    expect(sanitizeWarning(40, 60, 60)).toBe(15);
    expect(sanitizeWarning(15, 15, 60)).toBe(14);
    expect(sanitizeWarning(15, 60, 15)).toBe(14);
  });

  it('não inteiro volta ao padrão 5 e passa pela mesma regra', () => {
    expect(sanitizeWarning(2.5, 60, 60)).toBe(5);
    expect(sanitizeWarning('x', 60, 60)).toBe(5);
    expect(sanitizeWarning(undefined, 60, 60)).toBe(5);
  });
});

describe('constantes', () => {
  it('LIMIT_OPTIONS = 15, 20, …, 60', () => {
    expect(LIMIT_OPTIONS).toEqual([15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
    expect(DEFAULT_LIMIT).toBe(60);
    expect(DEFAULT_WARNING).toBe(5);
  });
});
