// Contagem do tempo com relógio monotônico e teto de 5 s por intervalo (R4, FR-011..015).

import { limitSeconds } from './day';
import type { CurrentDay } from './model';
import { isChildUseScreen, type BaseScreen } from './screen';

export const MAX_INTERVAL_MS = 5000;
export const SAVE_EVERY_SECONDS = 5;
export const TICK_MS = 1000;

export type CountConditions = {
  screen: BaseScreen;
  visible: boolean;
  exhausted: boolean;
  overlayOpen: boolean;
};

export function shouldCount({ screen, visible, exhausted, overlayOpen }: CountConditions): boolean {
  return isChildUseScreen(screen) && visible && !exhausted && !overlayOpen;
}

/** last: último instante monotônico visto (null = recomeçar); msAccumulator: ms ainda não gravados. */
export type CounterState = { last: number | null; msAccumulator: number };

export const INITIAL_COUNTER: CounterState = { last: null, msAccumulator: 0 };

export function tick(state: CounterState, now: number): CounterState {
  if (state.last === null) {
    return { ...state, last: now };
  }
  const delta = Math.min(MAX_INTERVAL_MS, Math.max(0, now - state.last));
  return { last: now, msAccumulator: state.msAccumulator + delta };
}

/** Recomeça a medição: o intervalo até o próximo tick não é contado. */
export function resume(state: CounterState): CounterState {
  return { ...state, last: null };
}

/** Separa os segundos inteiros acumulados, mantendo a fração. */
export function drain(state: CounterState): [CounterState, number] {
  const seconds = Math.floor(state.msAccumulator / 1000);
  return [{ ...state, msAccumulator: state.msAccumulator - seconds * 1000 }, seconds];
}

/** Soma segundos ao dia sem nunca diminuir e sem passar do limite (FR-015). */
export function addUsed(day: CurrentDay, seconds: number): CurrentDay {
  const usedSeconds = Math.min(limitSeconds(day), day.usedSeconds + Math.max(0, seconds));
  return usedSeconds === day.usedSeconds ? day : { ...day, usedSeconds };
}
