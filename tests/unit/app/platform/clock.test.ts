import { afterEach, describe, expect, it, vi } from 'vitest';
import { systemClock } from '@/platform/clock';

afterEach(() => {
  vi.useRealTimers();
});

describe('systemClock', () => {
  it('monotonic usa performance.now e now usa new Date()', () => {
    vi.useFakeTimers({ toFake: ['performance', 'Date'], now: new Date(2026, 10, 1, 10) });
    const before = systemClock.monotonic();
    vi.advanceTimersByTime(1500);
    expect(systemClock.monotonic() - before).toBe(1500);
    expect(systemClock.now().getTime()).toBe(new Date(2026, 10, 1, 10, 0, 1, 500).getTime());
  });
});
