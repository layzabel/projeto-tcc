import { afterEach, describe, expect, it, vi } from 'vitest';
import { isVisible, onHidden, onVisible } from '@/platform/visibility';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

describe('visibility (R4, FR-014)', () => {
  it('isVisible lê document.visibilityState', () => {
    setVisibility('visible');
    expect(isVisible()).toBe(true);
    setVisibility('hidden');
    expect(isVisible()).toBe(false);
  });

  it('visibilitychange → hidden e pagehide disparam onHidden', () => {
    const cb = vi.fn();
    const off = onHidden(cb);
    setVisibility('hidden');
    window.dispatchEvent(new Event('pagehide'));
    expect(cb).toHaveBeenCalledTimes(2);
    setVisibility('visible');
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    setVisibility('hidden');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('onVisible dispara na volta à visibilidade', () => {
    const cb = vi.fn();
    const off = onVisible(cb);
    setVisibility('hidden');
    expect(cb).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });
});
