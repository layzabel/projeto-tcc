'use client';

// Estado persistido exposto à interface com useSyncExternalStore (R2): na pré-renderização e na
// primeira renderização o snapshot é "carregando"; o documento só é lido após a montagem.

import { useEffect, useSyncExternalStore } from 'react';
import { localDate } from '../../domain/dates';
import { normalizeOnLoad, rollover } from '../../domain/day';
import { isComplete, type CompleteDocument, type StoredDocument } from '../../domain/model';
import { LOADING, type DocSnapshot } from '../../domain/screen';
import type { Clock } from '../../platform/clock';
import { createRepository, type Repository } from '../../storage/repository';

export type AppStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => DocSnapshot;
  getServerSnapshot: () => DocSnapshot;
  /** Lê o documento e passa a ouvir as outras abas; devolve a função de parada. */
  start: () => () => void;
  /** Altera um documento completo; sem documento completo não faz nada. */
  update: (fn: (doc: CompleteDocument) => CompleteDocument) => void;
  /** Grava qualquer documento (usado pela configuração inicial). */
  write: (fn: (doc: StoredDocument | null) => StoredDocument) => void;
  clear: () => void;
  /** Aplica a virada do dia se a data local mudou (R5). */
  refreshDay: () => void;
  saveFailed: () => boolean;
};

export type StoreDeps = { repository: Repository; clock: Clock };

export function createStore({ repository, clock }: StoreDeps): AppStore {
  let snapshot: DocSnapshot = LOADING;
  let started = false;
  const listeners = new Set<() => void>();

  const set = (next: DocSnapshot): void => {
    if (next !== snapshot) {
      snapshot = next;
      listeners.forEach((l) => l());
    }
  };

  const normalize = (doc: StoredDocument | null): StoredDocument | null =>
    isComplete(doc) ? normalizeOnLoad(rollover(doc, localDate(clock.now()))) : doc;

  const persistIfChanged = (doc: StoredDocument | null): void => {
    const next = normalize(doc);
    set(next !== doc && next ? repository.update(() => next) : next);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => LOADING,
    start() {
      if (!started) {
        started = true;
        persistIfChanged(repository.load());
      }
      const off = repository.subscribe((doc) => set(normalize(doc)));
      return () => {
        off();
      };
    },
    update(fn) {
      if (!isComplete(snapshot)) {
        return;
      }
      set(repository.update((doc) => (isComplete(doc) ? fn(doc) : (doc as StoredDocument))));
    },
    write(fn) {
      set(repository.update(fn));
    },
    clear() {
      repository.clear();
      set(null);
    },
    refreshDay() {
      if (isComplete(snapshot)) {
        persistIfChanged(snapshot);
      }
    },
    saveFailed: () => repository.saveFailed(),
  };
}

/** Assina o store e o inicia após a montagem. */
export function useAppState(store: AppStore): DocSnapshot {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => store.start(), [store]);
  return state;
}

let browserStore: AppStore | null = null;

/** Store do navegador; na pré-renderização devolve um store sem armazenamento (fica em "carregando"). */
export function getBrowserStore(clock: Clock): AppStore {
  if (typeof window === 'undefined') {
    return createStore({ repository: createRepository(null, new EventTarget()), clock });
  }
  browserStore ??= createStore({
    repository: createRepository(safeLocalStorage(), window),
    clock,
  });
  return browserStore;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
