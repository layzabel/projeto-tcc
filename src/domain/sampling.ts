// Sorteios puros sobre uma fonte injetada de números em [0, 1) (R9).

export type RandomSource = () => number;

/** Inteiro entre min e max, inclusive. */
export function randomInt(min: number, max: number, source: RandomSource): number {
  return min + Math.min(max - min, Math.floor(source() * (max - min + 1)));
}

export function pick<T>(items: readonly T[], source: RandomSource): T {
  return items[randomInt(0, items.length - 1, source)] as T;
}

/** Embaralhamento de Fisher–Yates sem alterar a entrada. */
export function shuffle<T>(items: readonly T[], source: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i, source);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Fonte determinística para testes: repete a sequência dada. */
export function sequenceSource(values: readonly number[]): RandomSource {
  let i = 0;
  return () => {
    const v = values[i % values.length] ?? 0;
    i += 1;
    return v;
  };
}
