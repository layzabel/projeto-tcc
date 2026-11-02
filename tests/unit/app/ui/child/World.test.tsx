import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AFFECTIONATE_PHRASES, PHRASES } from '@/content/phrases';
import { isComplete } from '@/domain/model';
import { sequenceSource } from '@/platform/random';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { World } from '@/ui/child/World';
import { createStore, useAppState } from '@/ui/state/store';
import { MemoryStorage, makeDoc, type DocOverrides } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };

function setup(overrides: DocOverrides = {}, random = sequenceSource([0])) {
  const doc = makeDoc(overrides);
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(doc));
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const { services, wrapper } = fakeServices({ random });
  const onOpen = vi.fn();
  const onAdult = vi.fn();
  function Harness() {
    const snap = useAppState(store);
    return isComplete(snap) ? (
      <World doc={snap} store={store} onOpen={onOpen} onAdult={onAdult} />
    ) : null;
  }
  const view = render(<Harness />, { wrapper });
  const current = () => {
    const snap = store.getSnapshot();
    if (!isComplete(snap)) throw new Error('sem documento');
    return snap;
  };
  const rerender = () => view.rerender(<Harness />);
  return { store, services, onOpen, onAdult, current, rerender };
}

const bubble = () => screen.getByRole('status');

describe('World — cumprimento e convite (FR-006, FR-006a)', () => {
  it('cumprimenta pelo nome', () => {
    setup({ profile: { nickname: 'Lia' } });
    expect(bubble()).toHaveTextContent(PHRASES.greeting('Lia'));
  });

  it('cumprimento genérico sem nome', () => {
    setup({ profile: { nickname: null } });
    expect(bubble()).toHaveTextContent(PHRASES.greeting(null));
  });

  it('convite na primeira abertura do dia: balão, voz e grava supervisionInviteShown', () => {
    const { services, current } = setup({ currentDay: { supervisionInviteShown: false } });
    expect(bubble()).toHaveTextContent(PHRASES.supervisionInvite);
    expect(services.speech.speak).toHaveBeenCalledWith(
      expect.stringContaining(PHRASES.supervisionInvite),
      expect.objectContaining({ voice: true }),
    );
    expect(current().currentDay.supervisionInviteShown).toBe(true);
  });

  it('convite não se repete no mesmo dia', () => {
    setup({ currentDay: { supervisionInviteShown: true } });
    expect(bubble()).not.toHaveTextContent(PHRASES.supervisionInvite);
  });

  it('o convite não bloqueia os botões', () => {
    const { onOpen } = setup({ currentDay: { supervisionInviteShown: false } });
    fireEvent.click(screen.getByRole('button', { name: 'Brincar' }));
    expect(onOpen).toHaveBeenCalledWith('jogo');
  });
});

describe('World — botões (FR-005)', () => {
  it('Mascote responde com frase do conjunto fixo (sorteio injetado)', () => {
    expect(AFFECTIONATE_PHRASES.length).toBeGreaterThanOrEqual(5);
    setup({}, sequenceSource([0.99]));
    fireEvent.click(screen.getByRole('button', { name: 'Mascote' }));
    expect(bubble()).toHaveTextContent(AFFECTIONATE_PHRASES.at(-1)!);
  });

  it('Brincar e História mudam a tela da criança', () => {
    const { onOpen } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Brincar' }));
    fireEvent.click(screen.getByRole('button', { name: 'História' }));
    expect(onOpen.mock.calls).toEqual([['jogo'], ['historia']]);
  });

  it('todos os alvos são alvos infantis e há o botão do adulto', () => {
    setup();
    for (const name of ['Brincar', 'História', 'Mascote']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('data-alvo-infantil');
    }
    expect(
      screen.getByRole('button', { name: 'Sou o adulto: segure por 3 segundos' }),
    ).toBeInTheDocument();
  });
});

describe('World — tempo sem números (FR-007, FR-008)', () => {
  it('céu, vaga-lumes e humor seguem o tempo usado', () => {
    setup({ currentDay: { usedSeconds: 12 * 60, limitMin: 60 } });
    expect(document.querySelector('[data-ceu]')).toHaveAttribute('data-ceu', 'dia');
    const lit = document.querySelectorAll('[data-aceso="true"]');
    expect(lit).toHaveLength(4);
    expect(document.querySelectorAll('[data-aceso]')).toHaveLength(5);
    expect(screen.getByRole('img', { name: /Vaga-lume/ })).toHaveAttribute('data-humor', 'feliz');
  });

  it('tarde e calmo depois da metade', () => {
    setup({ currentDay: { usedSeconds: 31 * 60, limitMin: 60, warningPlayed: false } });
    expect(document.querySelector('[data-ceu]')).toHaveAttribute('data-ceu', 'tarde');
    expect(screen.getByRole('img', { name: /Vaga-lume/ })).toHaveAttribute('data-humor', 'calmo');
  });
});

describe('World — aviso de "falta pouco" (FR-009)', () => {
  it('toca falta-pouco uma vez, fala, grava warningPlayed e fica com sono', () => {
    const { services, current, rerender } = setup({
      settings: { sounds: false },
      currentDay: { usedSeconds: 55 * 60, limitMin: 60 },
    });
    expect(services.sound.play).toHaveBeenCalledWith(
      'falta-pouco',
      expect.objectContaining({ sounds: false }),
    );
    expect(bubble()).toHaveTextContent(PHRASES.almostDone);
    expect(services.speech.speak).toHaveBeenCalledWith(PHRASES.almostDone, expect.anything());
    expect(current().currentDay.warningPlayed).toBe(true);
    expect(screen.getByRole('img', { name: /Vaga-lume/ })).toHaveAttribute(
      'data-humor',
      'com-sono',
    );
    expect(screen.getByText('Faltam 5 minutos')).toBeInTheDocument();
    rerender();
    expect(services.sound.play).toHaveBeenCalledTimes(1);
  });

  it('não toca antes do aviso', () => {
    const { services } = setup({ currentDay: { usedSeconds: 10 * 60 } });
    expect(services.sound.play).not.toHaveBeenCalled();
    expect(screen.queryByText(/Falta/)).toBeNull();
  });
});
