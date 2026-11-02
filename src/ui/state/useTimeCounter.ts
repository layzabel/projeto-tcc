'use client';

// Ticker de 1 s ativo só quando a contagem vale e a aba detém a trava (R4, R6). Grava a cada 5 s
// de contagem, ao atingir o limite, ao desativar (sair da tela infantil, abrir a área do adulto)
// e ao ocultar/sair da página (FR-014).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addUsed,
  drain,
  INITIAL_COUNTER,
  resume,
  SAVE_EVERY_SECONDS,
  tick,
  TICK_MS,
  type CounterState,
} from '../../domain/counting';
import { localDate } from '../../domain/dates';
import { limitSeconds } from '../../domain/day';
import { isComplete } from '../../domain/model';
import type { Clock } from '../../platform/clock';
import { acquireCounterLock, type Release } from '../../platform/counter-lock';
import { onHidden } from '../../platform/visibility';
import type { AppStore } from './store';

type Options = {
  active: boolean;
  store: AppStore;
  clock: Clock;
  acquireLock?: (signal: AbortSignal) => Promise<Release | null>;
};

/** Devolve os segundos já contados e ainda não gravados, para a tela refletir o tempo em ≤ 1 s. */
export function useTimeCounter({
  active,
  store,
  clock,
  acquireLock = acquireCounterLock,
}: Options): number {
  const [pending, setPending] = useState(0);
  const counter = useRef<CounterState>(INITIAL_COUNTER);
  const pendingRef = useRef(0);
  // A função da trava fica numa ref: uma identidade nova a cada renderização não deve reiniciar a
  // contagem (cada reinício perderia o intervalo em curso).
  const lockRef = useRef(acquireLock);

  useEffect(() => {
    lockRef.current = acquireLock;
  }, [acquireLock]);

  const save = useCallback(() => {
    const seconds = pendingRef.current;
    pendingRef.current = 0;
    if (seconds > 0) {
      store.update((doc) => ({ ...doc, currentDay: addUsed(doc.currentDay, seconds) }));
    }
    setPending(0);
  }, [store]);

  const reachedLimit = useCallback(() => {
    const doc = store.getSnapshot();
    return (
      isComplete(doc) &&
      doc.currentDay.usedSeconds + pendingRef.current >= limitSeconds(doc.currentDay)
    );
  }, [store]);

  // Virada do dia durante a contagem: grava o que pertence ao dia anterior antes de virar.
  const checkRollover = useCallback(() => {
    const doc = store.getSnapshot();
    if (isComplete(doc) && localDate(clock.now()) > doc.currentDay.date) {
      save();
      store.refreshDay();
    }
  }, [clock, save, store]);

  const onTick = useCallback(() => {
    checkRollover();
    const [next, seconds] = drain(tick(counter.current, clock.monotonic()));
    counter.current = next;
    pendingRef.current += seconds;
    if (pendingRef.current >= SAVE_EVERY_SECONDS || reachedLimit()) {
      save();
    } else {
      setPending(pendingRef.current);
    }
  }, [checkRollover, clock, reachedLimit, save]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const controller = new AbortController();
    let interval: ReturnType<typeof setInterval> | null = null;
    let release: Release | null = null;
    void lockRef.current(controller.signal).then((granted) => {
      if (!granted || controller.signal.aborted) {
        granted?.();
        return;
      }
      release = granted;
      counter.current = tick(resume(counter.current), clock.monotonic());
      interval = setInterval(onTick, TICK_MS);
    });
    const offHidden = onHidden(save);
    return () => {
      controller.abort();
      if (interval !== null) {
        clearInterval(interval);
      }
      offHidden();
      save();
      release?.();
    };
  }, [active, clock, onTick, save]);

  return pending;
}
