'use client';

// Estado de sessão não persistido (data-model.md › Estado de sessão).

import { useCallback, useState } from 'react';
import type { ChildScreen } from '../../domain/screen';

export type PanelTab = 'hoje' | 'ajustes' | 'registro';

export type AdultOverlay = 'fechado' | 'senha' | 'recuperacao' | { painel: PanelTab };

export type Session = {
  childScreen: ChildScreen;
  adultOverlay: AdultOverlay;
  /** Muda a cada abertura de tela infantil para remontar o encerramento do início (FR-028). */
  closureRun: number;
};

export const INITIAL_SESSION: Session = {
  childScreen: 'mundo',
  adultOverlay: 'fechado',
  closureRun: 0,
};

export function isOverlayOpen(overlay: AdultOverlay): boolean {
  return overlay !== 'fechado';
}

export function useSession() {
  const [session, setSession] = useState<Session>(INITIAL_SESSION);

  const setChildScreen = useCallback((childScreen: ChildScreen) => {
    setSession((s) => ({ ...s, childScreen }));
  }, []);

  const setOverlay = useCallback((adultOverlay: AdultOverlay) => {
    setSession((s) => ({ ...s, adultOverlay }));
  }, []);

  // Fechar a área do adulto reavalia a tela e recomeça um encerramento em andamento.
  const closeOverlay = useCallback(() => {
    setSession((s) => ({ ...s, adultOverlay: 'fechado', closureRun: s.closureRun + 1 }));
  }, []);

  const reset = useCallback(() => setSession(INITIAL_SESSION), []);

  return { session, setChildScreen, setOverlay, closeOverlay, reset };
}
