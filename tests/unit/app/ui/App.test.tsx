import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { App } from '@/ui/App';
import { createStore } from '@/ui/state/store';
import { MemoryStorage, makeDoc } from '../../../helpers/docs';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };

function storeWith(doc?: unknown) {
  const storage = new MemoryStorage();
  if (doc !== undefined) {
    storage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }
  return createStore({ repository: createRepository(storage, new EventTarget()), clock });
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
});

describe('App — movimento reduzido (FR-038, R13)', () => {
  it('sem gatilho, não marca data-motion', () => {
    mockMatchMedia(false);
    render(<App store={storeWith(makeDoc())} clock={clock} />);
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('ajuste "menos animação" liga data-motion="reduced"', () => {
    mockMatchMedia(false);
    render(<App store={storeWith(makeDoc({ settings: { reducedMotion: true } }))} clock={clock} />);
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('prefers-reduced-motion do aparelho liga data-motion="reduced"', () => {
    mockMatchMedia(true);
    render(<App store={storeWith()} clock={clock} />);
    expect(document.documentElement.dataset.motion).toBe('reduced');
  });
});

describe('App — tela derivada', () => {
  it('documento completo abre o mundo da criança', () => {
    mockMatchMedia(false);
    const { container } = render(<App store={storeWith(makeDoc())} clock={clock} />);
    expect(container.querySelector('[data-tela="mundo"]')).not.toBeNull();
  });
});
