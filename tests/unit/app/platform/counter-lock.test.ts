import { describe, expect, it, vi } from 'vitest';
import { acquireCounterLock, COUNTER_LOCK } from '@/platform/counter-lock';

type Callback = () => Promise<void>;

/** Dublê de navigator.locks com uma única trava exclusiva e fila de espera. */
function fakeLocks() {
  let held = false;
  const waiting: { cb: Callback; signal?: AbortSignal; resolve: (v: unknown) => void }[] = [];
  const run = (cb: Callback, resolve: (v: unknown) => void) => {
    held = true;
    void cb().then((v) => {
      held = false;
      resolve(v);
      const next = waiting.shift();
      if (next && !next.signal?.aborted) {
        run(next.cb, next.resolve);
      }
    });
  };
  const request = vi.fn(
    (name: string, options: { mode: string; signal?: AbortSignal }, cb: Callback) =>
      new Promise((resolve, reject) => {
        if (!held) {
          run(cb, resolve);
          return;
        }
        options.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        waiting.push({ cb, signal: options.signal, resolve });
      }),
  );
  return { request, isHeld: () => held };
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
};

describe('acquireCounterLock (R6, FR-020)', () => {
  it('pede a trava exclusiva tcc-cp-contagem e solta ao liberar', async () => {
    const locks = fakeLocks();
    const release = await acquireCounterLock(new AbortController().signal, locks);
    expect(COUNTER_LOCK).toBe('tcc-cp-contagem');
    expect(locks.request).toHaveBeenCalledWith(
      'tcc-cp-contagem',
      expect.objectContaining({ mode: 'exclusive' }),
      expect.any(Function),
    );
    expect(locks.isHeld()).toBe(true);
    release?.();
    await flush();
    expect(locks.isHeld()).toBe(false);
  });

  it('a segunda aba espera até a primeira soltar', async () => {
    const locks = fakeLocks();
    const releaseA = await acquireCounterLock(new AbortController().signal, locks);
    let gotB = false;
    const pendingB = acquireCounterLock(new AbortController().signal, locks).then((r) => {
      gotB = true;
      return r;
    });
    await flush();
    expect(gotB).toBe(false);
    releaseA?.();
    const releaseB = await pendingB;
    expect(gotB).toBe(true);
    releaseB?.();
  });

  it('abortar a espera devolve null', async () => {
    const locks = fakeLocks();
    await acquireCounterLock(new AbortController().signal, locks);
    const controller = new AbortController();
    const pending = acquireCounterLock(controller.signal, locks);
    controller.abort();
    await expect(pending).resolves.toBeNull();
  });

  it('sem navigator.locks conta normalmente', async () => {
    const release = await acquireCounterLock(new AbortController().signal, undefined);
    expect(typeof release).toBe('function');
    expect(() => release?.()).not.toThrow();
  });
});
