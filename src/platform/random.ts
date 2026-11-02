// Fonte de sorteio criptográfica (R9); nunca Math.random. Os sorteios em si são puros
// (domain/sampling) e recebem a fonte por injeção.

import * as sampling from '../domain/sampling';
import type { RandomSource } from '../domain/sampling';

export type { RandomSource } from '../domain/sampling';
export { sequenceSource } from '../domain/sampling';

const UINT32_RANGE = 2 ** 32;

/** Número em [0, 1) a partir de crypto.getRandomValues. */
export const random: RandomSource = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] ?? 0) / UINT32_RANGE;
};

export function randomInt(min: number, max: number, source: RandomSource = random): number {
  return sampling.randomInt(min, max, source);
}

export function pick<T>(items: readonly T[], source: RandomSource = random): T {
  return sampling.pick(items, source);
}

export function shuffle<T>(items: readonly T[], source: RandomSource = random): T[] {
  return sampling.shuffle(items, source);
}
