import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LOADING } from '@/domain/screen';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { createStore, useAppState } from '@/ui/state/store';
import { MemoryStorage, makeDoc } from '../../../helpers/docs';

function setup(initial?: unknown, now = new Date(2026, 10, 1, 10)) {
  const storage = new MemoryStorage();
  if (initial !== undefined) {
    storage.setItem(STORAGE_KEY, JSON.stringify(initial));
  }
  const target = new EventTarget();
  const repository = createRepository(storage, target);
  const clock = { monotonic: () => 0, now: () => now };
  const store = createStore({ repository, clock });
  return { storage, target, store };
}

function Probe({ store }: { store: ReturnType<typeof createStore> }) {
  const state = useAppState(store);
  return <span>{state === LOADING ? 'carregando' : 'pronto'}</span>;
}

describe('store (R2)', () => {
  it('getServerSnapshot devolve "carregando"', () => {
    const { store } = setup(makeDoc());
    expect(store.getServerSnapshot()).toBe(LOADING);
    expect(renderToString(<Probe store={store} />)).toContain('carregando');
  });

  it('após a montagem o snapshot vem de load com rollover aplicado', () => {
    const { store, storage } = setup(
      makeDoc({ currentDay: { date: '2026-10-31', usedSeconds: 900 } }),
    );
    const { result } = renderHook(() => useAppState(store));
    const doc = result.current;
    expect(doc).toMatchObject({ currentDay: { date: '2026-11-01', usedSeconds: 0 } });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).currentDay.date).toBe('2026-11-01');
  });

  it('sem documento → null', () => {
    const { store } = setup();
    const { result } = renderHook(() => useAppState(store));
    expect(result.current).toBeNull();
  });

  it('update notifica assinantes', () => {
    const { store } = setup(makeDoc());
    const { result } = renderHook(() => useAppState(store));
    const listener = vi.fn();
    store.subscribe(listener);
    act(() => {
      store.update((doc) => ({ ...doc, profile: { nickname: 'Bia' } }));
    });
    expect(listener).toHaveBeenCalled();
    expect(result.current).toMatchObject({ profile: { nickname: 'Bia' } });
  });

  it('evento storage de outra aba recarrega o documento', () => {
    const { store, target } = setup(makeDoc());
    const { result } = renderHook(() => useAppState(store));
    const event = new Event('storage');
    Object.assign(event, {
      key: STORAGE_KEY,
      newValue: JSON.stringify(makeDoc({ currentDay: { usedSeconds: 2000 } })),
    });
    act(() => {
      target.dispatchEvent(event);
    });
    expect(result.current).toMatchObject({ currentDay: { usedSeconds: 2000 } });
  });

  it('newValue = null leva a "sem documento"', () => {
    const { store, target } = setup(makeDoc());
    const { result } = renderHook(() => useAppState(store));
    const event = new Event('storage');
    Object.assign(event, { key: STORAGE_KEY, newValue: null });
    act(() => {
      target.dispatchEvent(event);
    });
    expect(result.current).toBeNull();
  });

  it('clear remove os dados e leva a "sem documento"', () => {
    const { store, storage } = setup(makeDoc());
    const { result } = renderHook(() => useAppState(store));
    act(() => store.clear());
    expect(result.current).toBeNull();
    expect(storage).toHaveLength(0);
  });

  it('refreshDay vira o dia quando a data local muda', () => {
    let now = new Date(2026, 10, 1, 23, 59, 50);
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc({ currentDay: { closure: 'concluido' } })));
    const store = createStore({
      repository: createRepository(storage, new EventTarget()),
      clock: { monotonic: () => 0, now: () => now },
    });
    const { result } = renderHook(() => useAppState(store));
    act(() => store.refreshDay());
    expect(result.current).toMatchObject({ currentDay: { date: '2026-11-01' } });
    now = new Date(2026, 10, 2, 0, 0, 5);
    act(() => store.refreshDay());
    expect(result.current).toMatchObject({
      currentDay: { date: '2026-11-02', closure: 'nao-iniciado', usedSeconds: 0 },
    });
  });
});
