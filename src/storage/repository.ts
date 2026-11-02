// Repositório do documento único no localStorage (contracts/storage-schema.md).

import { isComplete, type StoredDocument } from '../domain/model';
import { parseDocument, sanitize } from './schema';

export const STORAGE_KEY = 'tcc-cp:v1';

export type Repository = {
  /** Leitura de abertura: remove documento incompleto e regrava o saneado. Nunca lança. */
  load: () => StoredDocument | null;
  /** Relê, aplica fn, saneia e grava numa única escrita. */
  update: (fn: (doc: StoredDocument | null) => StoredDocument | null) => StoredDocument | null;
  clear: () => void;
  subscribe: (listener: (doc: StoredDocument | null) => void) => () => void;
  saveFailed: () => boolean;
};

function readText(storage: Storage | null): string | null {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

// Garante que o tempo usado nunca diminua no mesmo dia (FR-015).
function keepUsedSeconds(next: StoredDocument, current: StoredDocument | null): StoredDocument {
  if (!isComplete(next) || !isComplete(current)) {
    return next;
  }
  if (next.currentDay.date !== current.currentDay.date) {
    return next;
  }
  const usedSeconds = Math.max(next.currentDay.usedSeconds, current.currentDay.usedSeconds);
  return usedSeconds === next.currentDay.usedSeconds
    ? next
    : { ...next, currentDay: { ...next.currentDay, usedSeconds } };
}

export function createRepository(
  storage: Storage | null,
  events: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
): Repository {
  let failed = false;
  let memory: StoredDocument | null = null;

  const write = (doc: StoredDocument): void => {
    try {
      if (!storage) {
        throw new Error('armazenamento indisponível');
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(doc));
      failed = false;
    } catch {
      failed = true;
    }
  };

  const remove = (): void => {
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // nada a fazer: o documento continua inacessível para a aplicação
    }
  };

  const read = (): StoredDocument | null =>
    failed && memory ? memory : parseDocument(readText(storage)).doc;

  return {
    load() {
      const { doc, changed } = parseDocument(readText(storage));
      if (doc && !doc.setupCompleted) {
        remove();
        memory = null;
        return null;
      }
      if (doc && changed) {
        write(doc);
      }
      memory = doc;
      return doc;
    },
    update(fn) {
      const current = read();
      const sanitized = sanitize(fn(current)).doc;
      if (!sanitized) {
        return current;
      }
      const next = keepUsedSeconds(sanitized, current);
      memory = next;
      write(next);
      return next;
    },
    clear() {
      remove();
      memory = null;
      failed = false;
    },
    subscribe(listener) {
      const handler = (event: Event): void => {
        const { key, newValue } = event as StorageEvent;
        if (key !== STORAGE_KEY && key !== null) {
          return;
        }
        const doc = newValue === null ? null : parseDocument(newValue).doc;
        memory = doc;
        listener(doc);
      };
      events.addEventListener('storage', handler);
      return () => events.removeEventListener('storage', handler);
    },
    saveFailed: () => failed,
  };
}
