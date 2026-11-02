// Recuperação da senha por uma multiplicação de 2 × 1 dígitos, sem dado pessoal (FR-032).

import { randomInt, type RandomSource } from './sampling';

export type Challenge = { a: number; b: number };

export function newChallenge(source: RandomSource): Challenge {
  return { a: randomInt(12, 19, source), b: randomInt(3, 9, source) };
}

export function checkAnswer({ a, b }: Challenge, answer: string): boolean {
  const text = answer.trim();
  return /^\d+$/.test(text) && Number(text) === a * b;
}
