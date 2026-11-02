'use client';

// Virada do dia com a aplicação aberta: checa na carga, na volta à visibilidade e a cada 30 s,
// mesmo fora das telas infantis, para liberar o bloqueio à meia-noite (R5, FR-029).

import { useEffect } from 'react';
import { onVisible } from '../../platform/visibility';
import type { AppStore } from './store';

export const ROLLOVER_CHECK_MS = 30_000;

export function useDayRollover(store: AppStore): void {
  useEffect(() => {
    store.refreshDay();
    const id = setInterval(() => store.refreshDay(), ROLLOVER_CHECK_MS);
    const off = onVisible(() => store.refreshDay());
    return () => {
      clearInterval(id);
      off();
    };
  }, [store]);
}
