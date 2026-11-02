// Visibilidade da página (Page Visibility) e saída da página (pagehide).

export function isVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

/** Chama cb ao ocultar a página ou ao sair dela. */
export function onHidden(cb: () => void): () => void {
  const onChange = () => {
    if (!isVisible()) {
      cb();
    }
  };
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('pagehide', cb);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('pagehide', cb);
  };
}

/** Chama cb quando a página volta a ficar visível. */
export function onVisible(cb: () => void): () => void {
  const onChange = () => {
    if (isVisible()) {
      cb();
    }
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** Assinatura para useSyncExternalStore. */
export function subscribeVisibility(cb: () => void): () => void {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
}
