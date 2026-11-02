import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isComplete } from '@/domain/model';
import { systemClock } from '@/platform/clock';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { createStore } from '@/ui/state/store';
import { ROLLOVER_CHECK_MS, useDayRollover } from '@/ui/state/useDayRollover';
import { MemoryStorage, makeDoc } from '../../../helpers/docs';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'],
    now: new Date(2026, 10, 1, 23, 59, 0),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(makeDoc({ currentDay: { usedSeconds: 3600, closure: 'concluido' } })),
  );
  const store = createStore({
    repository: createRepository(storage, new EventTarget()),
    clock: systemClock,
  });
  store.start();
  return { store };
}

describe('useDayRollover (R5, FR-029)', () => {
  it('checa na carga e a cada 30 s, liberando o bloqueio na meia-noite', () => {
    const { store } = setup();
    const spy = vi.spyOn(store, 'refreshDay');
    renderHook(() => useDayRollover(store));
    expect(ROLLOVER_CHECK_MS).toBe(30_000);
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(spy).toHaveBeenCalledTimes(2);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    const doc = store.getSnapshot();
    expect(isComplete(doc) && doc.currentDay).toMatchObject({
      date: '2026-11-02',
      closure: 'nao-iniciado',
      usedSeconds: 0,
    });
  });

  it('checa na volta à visibilidade', () => {
    const { store } = setup();
    const spy = vi.spyOn(store, 'refreshDay');
    renderHook(() => useDayRollover(store));
    spy.mockClear();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
