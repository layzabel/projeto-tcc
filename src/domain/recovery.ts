// Recuperação da senha por uma soma de dois números de 20 a 49, sem dado pessoal (FR-032).

import { randomInt, type RandomSource } from './sampling';

export const RECOVERY_MIN = 20;
export const RECOVERY_MAX = 49;

export type Challenge = { a: number; b: number };

export function newChallenge(source: RandomSource): Challenge {
  return {
    a: randomInt(RECOVERY_MIN, RECOVERY_MAX, source),
    b: randomInt(RECOVERY_MIN, RECOVERY_MAX, source),
  };
}

export function checkAnswer({ a, b }: Challenge, answer: string): boolean {
  const text = answer.trim();
  return /^\d+$/.test(text) && Number(text) === a + b;
}
