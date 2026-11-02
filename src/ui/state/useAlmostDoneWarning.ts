'use client';

// Aviso de "falta pouco": som obrigatório, fala do mascote e registro de que já tocou hoje
// (FR-009). Nunca toca mais de uma vez por dia.

import { useEffect, useRef } from 'react';
import { PHRASES } from '../../content/phrases';
import type { CompleteDocument } from '../../domain/model';
import { shouldWarn } from '../../domain/progress';
import { useServices } from './services';
import type { AppStore } from './store';

export function useAlmostDoneWarning(doc: CompleteDocument, store: AppStore): void {
  const { sound, speech } = useServices();
  const warned = useRef(false);
  const due = shouldWarn(doc.currentDay, doc.settings.warningMin);
  const { sounds, voice } = doc.settings;

  useEffect(() => {
    if (!due || warned.current) {
      return;
    }
    warned.current = true;
    sound.play('falta-pouco', { sounds });
    speech.speak(PHRASES.almostDone, { voice });
    store.update((current) => ({
      ...current,
      currentDay: { ...current.currentDay, warningPlayed: true },
    }));
  }, [due, sound, sounds, speech, store, voice]);
}
