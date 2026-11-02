import { describe, expect, it, vi } from 'vitest';
import { vibrate } from '@/platform/vibration';

describe('vibrate', () => {
  it('chama navigator.vibrate quando existe', () => {
    const nav = { vibrate: vi.fn(() => true) };
    vibrate(200, nav);
    expect(nav.vibrate).toHaveBeenCalledWith(200);
  });

  it('não falha sem suporte', () => {
    expect(() => vibrate(200, {})).not.toThrow();
    expect(() => vibrate(200, undefined)).not.toThrow();
  });
});
