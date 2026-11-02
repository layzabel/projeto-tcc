import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isComplete } from '@/domain/model';
import { systemClock } from '@/platform/clock';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { createStore } from '@/ui/state/store';
import { useTimeCounter } from '@/ui/state/useTimeCounter';
import { MemoryStorage, makeDoc } from '../../../helpers/docs';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance', 'Date'],
    now: new Date(2026, 10, 1, 10),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(used = 0) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc({ currentDay: { usedSeconds: used } })));
  const store = createStore({
    repository: createRepository(storage, new EventTarget()),
    clock: systemClock,
  });
  store.start();
  const acquireLock = vi.fn(async () => vi.fn());
  const saved = () => JSON.parse(storage.getItem(STORAGE_KEY)!).currentDay.usedSeconds as number;
  const memory = () => {
    const doc = store.getSnapshot();
    return isComplete(doc) ? doc.currentDay.usedSeconds : -1;
  };
  return { storage, store, acquireLock, saved, memory };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function render(props: Parameters<typeof useTimeCounter>[0]) {
  return renderHook((p: Parameters<typeof useTimeCounter>[0]) => useTimeCounter(p), {
    initialProps: props,
  });
}

describe('useTimeCounter (R4, FR-011..015)', () => {
  it('conta só ativo e com a trava; grava a cada 5 s de contagem', async () => {
    const { store, acquireLock, saved } = setup(100);
    const hook = render({ active: true, store, clock: systemClock, acquireLock });
    await advance(0);
    expect(acquireLock).toHaveBeenCalledTimes(1);
    await advance(3000);
    expect(hook.result.current).toBe(3);
    expect(saved()).toBe(100);
    await advance(2000);
    expect(saved()).toBe(105);
    expect(hook.result.current).toBe(0);
    await advance(5000);
    expect(saved()).toBe(110);
  });

  it('inativo não conta', async () => {
    const { store, acquireLock, saved } = setup(100);
    render({ active: false, store, clock: systemClock, acquireLock });
    await advance(20_000);
    expect(acquireLock).not.toHaveBeenCalled();
    expect(saved()).toBe(100);
  });

  it('sem a trava (outra aba contando) não conta', async () => {
    const { store, saved } = setup(100);
    const acquireLock = vi.fn(() => new Promise<null>(() => undefined));
    render({ active: true, store, clock: systemClock, acquireLock });
    await advance(20_000);
    expect(saved()).toBe(100);
  });

  it('grava ao sair de tela infantil e solta a trava', async () => {
    const { store, saved } = setup(100);
    const release = vi.fn();
    const acquireLock = vi.fn(async () => release);
    const hook = render({ active: true, store, clock: systemClock, acquireLock });
    await advance(3000);
    hook.rerender({ active: false, store, clock: systemClock, acquireLock });
    expect(saved()).toBe(103);
    expect(release).toHaveBeenCalled();
  });

  it('grava ao ocultar e em pagehide', async () => {
    const { store, acquireLock, saved } = setup(100);
    render({ active: true, store, clock: systemClock, acquireLock });
    await advance(2000);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(saved()).toBe(102);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await advance(3000);
    window.dispatchEvent(new Event('pagehide'));
    expect(saved()).toBe(105);
  });

  it('ao reativar, o tempo inativo não entra', async () => {
    const { store, acquireLock, saved } = setup(100);
    const hook = render({ active: true, store, clock: systemClock, acquireLock });
    await advance(5000);
    hook.rerender({ active: false, store, clock: systemClock, acquireLock });
    await advance(600_000);
    hook.rerender({ active: true, store, clock: systemClock, acquireLock });
    await advance(5000);
    expect(saved()).toBe(110);
  });

  it('para no limite: nunca grava além de limitSeconds', async () => {
    const { store, acquireLock, memory } = setup(3597);
    render({ active: true, store, clock: systemClock, acquireLock });
    await advance(10_000);
    expect(memory()).toBe(3600);
  });
});
