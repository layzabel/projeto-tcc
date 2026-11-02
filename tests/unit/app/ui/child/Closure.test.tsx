import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { ACTIVITIES } from '@/content/activities';
import { PHRASES } from '@/content/phrases';
import { STORY_PAGES } from '@/content/story';
import { BREATH_PHASE_MS, closureSteps, STEP_DURATION_MS } from '@/domain/closure';
import { isComplete, type ClosureStyle } from '@/domain/model';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { Closure, REACTION_MS } from '@/ui/child/Closure';
import { createStore, useAppState } from '@/ui/state/store';
import { MemoryStorage, makeDoc } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: new Date(2026, 10, 1, 10),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const clock = { monotonic: () => performance.now(), now: () => new Date() };

function setup(style: ClosureStyle, nickname: string | null = 'Lia') {
  const storage = new MemoryStorage();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      makeDoc({
        profile: { nickname },
        settings: { closureStyle: style },
        currentDay: { usedSeconds: 3600, limitMin: 60, closure: 'em-andamento' },
      }),
    ),
  );
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const { services, wrapper } = fakeServices();
  function Harness() {
    const doc = useAppState(store);
    return isComplete(doc) ? <Closure doc={doc} store={store} onAdult={vi.fn()} /> : null;
  }
  const view = render(<Harness />, { wrapper });
  const closure = () => {
    const doc = store.getSnapshot();
    return isComplete(doc) ? doc.currentDay.closure : null;
  };
  return { services, view, closure, Harness };
}

const step = () => document.querySelector('[data-tela="encerramento"]')?.getAttribute('data-etapa');
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const adultButton = () =>
  screen.queryByRole('button', { name: 'Sou o adulto: segure por 3 segundos' });

function chooseCard() {
  fireEvent.click(screen.getByRole('button', { name: ACTIVITIES[0]!.label }));
  advance(REACTION_MS);
}

function readStory() {
  for (let i = 0; i < STORY_PAGES.length; i += 1) {
    const page = screen.getByRole('button', { name: /Tocar na história|Próxima página/ });
    fireEvent.click(page);
    fireEvent.click(screen.getByRole('button', { name: /Próxima página/ }));
  }
}

describe('Closure (US3, FR-027, SC-006)', () => {
  it('respiração: aviso, 3 respirações, elogio, escolha, despedida → concluido', () => {
    const { closure, services } = setup('respiracao');
    const seen: string[] = [];
    expect(services.sound.play).toHaveBeenCalledWith('fim-de-tempo', expect.anything());
    expect(services.speech.speak).toHaveBeenCalledWith(
      PHRASES.closureWarning('Lia'),
      expect.anything(),
    );
    seen.push(step()!);
    expect(adultButton()).not.toBeNull();
    advance(STEP_DURATION_MS.aviso!);
    for (let i = 0; i < 3; i += 1) {
      seen.push(step()!);
      expect(document.querySelector('[data-fase]')).toHaveAttribute('data-fase', 'inspira');
      advance(BREATH_PHASE_MS);
      expect(document.querySelector('[data-fase]')).toHaveAttribute('data-fase', 'solta');
      expect(adultButton()).not.toBeNull();
      advance(BREATH_PHASE_MS);
    }
    seen.push(step()!);
    advance(STEP_DURATION_MS.elogio!);
    seen.push(step()!);
    expect(adultButton()).not.toBeNull();
    advance(60_000);
    expect(step()).toBe('escolha');
    chooseCard();
    seen.push(step()!);
    expect(closure()).toBe('em-andamento');
    advance(STEP_DURATION_MS.despedida!);
    expect(seen).toEqual(closureSteps('respiracao'));
    expect(closure()).toBe('concluido');
  });

  it('historinha: a história de 6 páginas entre o aviso e o elogio', () => {
    const { closure } = setup('historinha');
    advance(STEP_DURATION_MS.aviso!);
    expect(step()).toBe('historia');
    readStory();
    expect(step()).toBe('elogio');
    advance(STEP_DURATION_MS.elogio!);
    chooseCard();
    expect(step()).toBe('despedida');
    advance(STEP_DURATION_MS.despedida!);
    expect(closure()).toBe('concluido');
  });

  it('simples: o aviso vai direto ao elogio; fala genérica sem nome', () => {
    const { services } = setup('simples', null);
    expect(services.speech.speak).toHaveBeenCalledWith(
      PHRASES.closureWarning(null),
      expect.anything(),
    );
    advance(STEP_DURATION_MS.aviso!);
    expect(step()).toBe('elogio');
  });

  it('a escolha espera o toque; o mascote reage', () => {
    const { services } = setup('simples');
    advance(STEP_DURATION_MS.aviso!);
    advance(STEP_DURATION_MS.elogio!);
    expect(step()).toBe('escolha');
    expect(
      screen.getAllByRole('button').filter((b) => b.hasAttribute('data-alvo-infantil')),
    ).toHaveLength(5);
    advance(120_000);
    expect(step()).toBe('escolha');
    fireEvent.click(screen.getByRole('button', { name: ACTIVITIES[2]!.label }));
    expect(screen.getByRole('status')).toHaveTextContent(ACTIVITIES[2]!.reaction);
    expect(services.sound.play).toHaveBeenCalledWith('reacao', expect.anything());
  });

  it('remontar no meio aborta a execução anterior e recomeça do aviso (FR-028)', () => {
    const { view, Harness, services, closure } = setup('respiracao');
    advance(STEP_DURATION_MS.aviso! + BREATH_PHASE_MS);
    expect(step()).toBe('respiracao');
    view.unmount();
    expect(services.speech.cancelSpeech).toHaveBeenCalled();
    const playsBefore = vi.mocked(services.sound.play).mock.calls.length;
    advance(10 * 60_000);
    expect(vi.mocked(services.sound.play).mock.calls).toHaveLength(playsBefore);
    expect(closure()).toBe('em-andamento');

    const { wrapper } = fakeServices();
    render(<Harness />, { wrapper });
    expect(step()).toBe('aviso');
  });
});
