import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { sequenceSource } from '../../src/platform/random';
import { ServicesProvider, type Services } from '../../src/ui/state/services';

/** Serviços falsos para os testes de componentes. */
export function fakeServices(overrides: Partial<Services> = {}) {
  const services = {
    sound: { play: vi.fn() },
    speech: { speak: vi.fn(() => true), cancelSpeech: vi.fn() },
    random: sequenceSource([0]),
    vibrate: vi.fn(),
    clock: { monotonic: () => performance.now(), now: () => new Date() },
    ...overrides,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesProvider value={services}>{children}</ServicesProvider>
  );
  return { services, wrapper };
}
