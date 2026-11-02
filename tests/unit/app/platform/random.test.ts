import { describe, expect, it, vi } from 'vitest';
import { pick, random, randomInt, sequenceSource, shuffle } from '@/platform/random';

describe('random (R9)', () => {
  it('fica em [0, 1) e usa crypto.getRandomValues', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    for (let i = 0; i < 200; i += 1) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('valor máximo de 32 bits continua abaixo de 1', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      (array as Uint32Array)[0] = 0xffffffff;
      return array;
    });
    expect(random()).toBeLessThan(1);
    spy.mockRestore();
  });
});

describe('randomInt', () => {
  it('é inclusivo nos dois extremos', () => {
    expect(randomInt(12, 19, () => 0)).toBe(12);
    expect(randomInt(12, 19, () => 0.999999)).toBe(19);
    expect(randomInt(3, 9, () => 0.5)).toBe(6);
  });

  it('com a fonte real cobre o intervalo', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      seen.add(randomInt(1, 3));
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
});

describe('shuffle e pick', () => {
  it('shuffle é determinístico com fonte injetada e não altera a entrada', () => {
    const items = [1, 2, 3, 4];
    const a = shuffle(items, sequenceSource([0.1, 0.7, 0.3]));
    const b = shuffle(items, sequenceSource([0.1, 0.7, 0.3]));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4]);
    expect(items).toEqual([1, 2, 3, 4]);
  });

  it('pick escolhe pelo índice sorteado', () => {
    expect(pick(['a', 'b', 'c'], () => 0.5)).toBe('b');
  });

  it('sequenceSource repete a sequência', () => {
    const s = sequenceSource([0.1, 0.2]);
    expect([s(), s(), s()]).toEqual([0.1, 0.2, 0.1]);
  });
});
