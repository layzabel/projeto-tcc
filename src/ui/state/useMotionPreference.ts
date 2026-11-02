'use client';

// Liga data-motion="reduced" no elemento raiz quando "menos animação" está ativo ou o aparelho
// prefere movimento reduzido (FR-038, R13).

import { useEffect, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function media(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const list = media();
  list?.addEventListener?.('change', onChange);
  return () => list?.removeEventListener?.('change', onChange);
}

const getSnapshot = (): boolean => media()?.matches === true;
const getServerSnapshot = (): boolean => false;

export function useMotionPreference(settingReduced: boolean): boolean {
  const systemReduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reduced = settingReduced || systemReduced;

  useEffect(() => {
    const root = document.documentElement;
    if (reduced) {
      root.dataset.motion = 'reduced';
    } else {
      delete root.dataset.motion;
    }
  }, [reduced]);

  return reduced;
}
