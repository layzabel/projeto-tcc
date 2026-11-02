import { describe, expect, it, vi } from 'vitest';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { MemoryStorage, makeDoc } from '../../../helpers/docs';

function setup(initial?: unknown) {
  const storage = new MemoryStorage();
  if (initial !== undefined) {
    storage.setItem(STORAGE_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial));
    storage.setCalls = 0;
  }
  const target = new EventTarget();
  const repo = createRepository(storage, target);
  return { storage, target, repo };
}

describe('repository.load', () => {
  it('usa a chave tcc-cp:v1', () => {
    expect(STORAGE_KEY).toBe('tcc-cp:v1');
  });

  it('nunca lança: sem chave, JSON inválido e storage que lança', () => {
    expect(setup().repo.load()).toBeNull();
    expect(setup('{').repo.load()).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(createRepository(broken, new EventTarget()).load()).toBeNull();
    expect(createRepository(null, new EventTarget()).load()).toBeNull();
  });

  it('documento com setupCompleted = false é removido (US1 cenário 8)', () => {
    const { storage, repo } = setup({
      schemaVersion: 1,
      consent: { acceptedAt: '2026-11-01T10:00:00Z', textVersion: '1.0' },
      setupCompleted: false,
    });
    expect(repo.load()).toBeNull();
    expect(storage).toHaveLength(0);
  });

  it('documento válido é devolvido sem regravar', () => {
    const { storage, repo } = setup(makeDoc());
    expect(repo.load()).toEqual(makeDoc());
    expect(storage.setCalls).toBe(0);
  });

  it('documento saneado é regravado quando mudou', () => {
    const adulterado = makeDoc({ settings: { dailyLimitMin: 999 } });
    const { storage, repo } = setup(adulterado);
    expect(repo.load()?.setupCompleted && repo.load()).toMatchObject({
      settings: { dailyLimitMin: 60 },
    });
    expect(storage.setCalls).toBeGreaterThan(0);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).settings.dailyLimitMin).toBe(60);
  });
});

describe('repository.update', () => {
  it('relê, aplica, saneia e faz um único setItem', () => {
    const { storage, repo } = setup(makeDoc());
    const fn = vi.fn((doc) => ({ ...doc, settings: { ...doc.settings, dailyLimitMin: 1000 } }));
    const next = repo.update(fn);
    expect(fn).toHaveBeenCalledWith(makeDoc());
    expect(storage.setCalls).toBe(1);
    expect(next).toMatchObject({ settings: { dailyLimitMin: 60 } });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(next);
  });

  it('relê o que outra aba gravou', () => {
    const { storage, repo } = setup(makeDoc());
    storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc({ currentDay: { usedSeconds: 2000 } })));
    const fn = vi.fn((doc) => doc);
    repo.update(fn);
    expect(fn.mock.calls[0]![0].currentDay.usedSeconds).toBe(2000);
  });

  it('garante usedSeconds ≥ valor relido no mesmo dia (FR-015)', () => {
    const { repo } = setup(makeDoc({ currentDay: { usedSeconds: 1500 } }));
    const next = repo.update((doc) =>
      doc && doc.setupCompleted
        ? { ...doc, currentDay: { ...doc.currentDay, usedSeconds: 100 } }
        : doc,
    );
    expect(next).toMatchObject({ currentDay: { usedSeconds: 1500 } });
  });

  it('permite usedSeconds menor quando o dia é outro (virada)', () => {
    const { repo } = setup(makeDoc({ currentDay: { usedSeconds: 1500 } }));
    const next = repo.update((doc) =>
      doc && doc.setupCompleted
        ? { ...doc, currentDay: { ...doc.currentDay, date: '2026-11-02', usedSeconds: 0 } }
        : doc,
    );
    expect(next).toMatchObject({ currentDay: { date: '2026-11-02', usedSeconds: 0 } });
  });

  it.each(['QuotaExceededError', 'SecurityError'])(
    'falha de setItem (%s) mantém o estado em memória e sinaliza saveFailed',
    (name) => {
      const { storage, repo } = setup(makeDoc());
      const error = new Error(name);
      error.name = name;
      storage.failWith = error;
      const next = repo.update((doc) =>
        doc && doc.setupCompleted
          ? { ...doc, currentDay: { ...doc.currentDay, usedSeconds: 1600 } }
          : doc,
      );
      expect(next).toMatchObject({ currentDay: { usedSeconds: 1600 } });
      expect(repo.saveFailed()).toBe(true);
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!).currentDay.usedSeconds).toBe(1500);

      const again = repo.update((doc) =>
        doc && doc.setupCompleted
          ? {
              ...doc,
              currentDay: { ...doc.currentDay, usedSeconds: doc.currentDay.usedSeconds + 5 },
            }
          : doc,
      );
      expect(again).toMatchObject({ currentDay: { usedSeconds: 1605 } });

      storage.failWith = null;
      repo.update((doc) => doc);
      expect(repo.saveFailed()).toBe(false);
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!).currentDay.usedSeconds).toBe(1605);
    },
  );

  it('grava documento incompleto (consentimento) sem removê-lo', () => {
    const { storage, repo } = setup();
    const pending = {
      schemaVersion: 1 as const,
      consent: { acceptedAt: '2026-11-01T10:00:00.000Z', textVersion: '1.0' },
      setupCompleted: false as const,
    };
    expect(repo.update(() => pending)).toEqual(pending);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(pending);
  });
});

describe('repository.clear', () => {
  it('deixa localStorage.length === 0', () => {
    const { storage, repo } = setup(makeDoc());
    repo.clear();
    expect(storage).toHaveLength(0);
    expect(repo.load()).toBeNull();
  });
});

describe('repository.subscribe (evento storage)', () => {
  function storageEvent(key: string | null, newValue: string | null): Event {
    const event = new Event('storage');
    Object.assign(event, { key, newValue });
    return event;
  }

  it('notifica com o documento saneado quando outra aba grava tcc-cp:v1', () => {
    const { target, repo } = setup();
    const listener = vi.fn();
    const off = repo.subscribe(listener);
    target.dispatchEvent(storageEvent(STORAGE_KEY, JSON.stringify(makeDoc())));
    expect(listener).toHaveBeenCalledWith(makeDoc());
    target.dispatchEvent(storageEvent('outra', '{}'));
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    target.dispatchEvent(storageEvent(STORAGE_KEY, JSON.stringify(makeDoc())));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('newValue = null (dados apagados em outra aba) → null', () => {
    const { target, repo } = setup();
    const listener = vi.fn();
    repo.subscribe(listener);
    target.dispatchEvent(storageEvent(STORAGE_KEY, null));
    expect(listener).toHaveBeenCalledWith(null);
    target.dispatchEvent(storageEvent(null, null));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
