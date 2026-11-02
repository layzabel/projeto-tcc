// Tempo restante comunicado sem números: céu, sol, vaga-lumes e humor do mascote (FR-007..009).

import { consumed, exhausted, limitSeconds, remainingSeconds } from './day';
import type { CurrentDay } from './model';

export type SkyPhase = 'dia' | 'tarde' | 'anoitecer' | 'noite';
export type Mood = 'feliz' | 'calmo' | 'com-sono' | 'dormindo' | 'festejando';

export const FIREFLIES = 5;

export function skyPhase(day: CurrentDay): Exclude<SkyPhase, 'noite'> {
  const remaining = remainingSeconds(day);
  const limit = limitSeconds(day);
  if (remaining * 3 > limit * 2) {
    return 'dia';
  }
  return remaining * 3 > limit ? 'tarde' : 'anoitecer';
}

/** Um vaga-lume se apaga a cada 20% do limite consumido (conta inteira, sem erro de ponto flutuante). */
export function firefliesLit(day: CurrentDay): number {
  const off = Math.floor((day.usedSeconds * FIREFLIES) / limitSeconds(day));
  return FIREFLIES - Math.min(FIREFLIES, off);
}

export function sunPosition(day: CurrentDay): number {
  return 1 - consumed(day);
}

export function mascotMood(day: CurrentDay, warningMin: number): Mood {
  const remaining = remainingSeconds(day);
  if (remaining * 2 > limitSeconds(day)) {
    return 'feliz';
  }
  return remaining > warningMin * 60 ? 'calmo' : 'com-sono';
}

export function shouldWarn(day: CurrentDay, warningMin: number): boolean {
  return !day.warningPlayed && !exhausted(day) && remainingSeconds(day) <= warningMin * 60;
}

/** Complemento opcional para o adulto, com os minutos restantes arredondados para cima. */
export function remainingMinutesLabel(day: CurrentDay): string {
  const minutes = Math.ceil(remainingSeconds(day) / 60);
  return minutes === 1 ? 'Falta 1 minuto' : `Faltam ${minutes} minutos`;
}
