// Trava entre abas: só a aba que detém a Web Lock exclusiva conta tempo (R6, FR-020).

export const COUNTER_LOCK = 'tcc-cp-contagem';

type LockManagerLike = {
  request: (
    name: string,
    options: { mode: 'exclusive'; signal?: AbortSignal },
    callback: () => Promise<void>,
  ) => Promise<unknown>;
};

export type Release = () => void;

function browserLocks(): LockManagerLike | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator.locks as LockManagerLike);
}

/**
 * Espera a trava e devolve a função que a solta; null se a espera foi abortada. Sem
 * navigator.locks, a aba conta normalmente (degradação documentada em R6).
 */
export function acquireCounterLock(
  signal: AbortSignal,
  locks: LockManagerLike | undefined = browserLocks(),
): Promise<Release | null> {
  if (!locks) {
    return Promise.resolve(() => undefined);
  }
  return new Promise((resolve) => {
    let release: Release = () => undefined;
    const held = new Promise<void>((done) => {
      release = done;
    });
    locks
      .request(COUNTER_LOCK, { mode: 'exclusive', signal }, () => {
        if (signal.aborted) {
          return Promise.resolve();
        }
        resolve(release);
        return held;
      })
      .catch(() => resolve(null));
  });
}
