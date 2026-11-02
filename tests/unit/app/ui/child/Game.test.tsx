import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHRASES } from '@/content/phrases';
import { isComplete } from '@/domain/model';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { CELEBRATION_MS, Game } from '@/ui/child/Game';
import { createStore, useAppState } from '@/ui/state/store';
import { MemoryStorage, makeDoc } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };

function setup(sounds = true) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc({ settings: { sounds } })));
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const { services, wrapper } = fakeServices();
  const onFinish = vi.fn();
  function Harness() {
    const doc = useAppState(store);
    return isComplete(doc) ? <Game doc={doc} store={store} onFinish={onFinish} /> : null;
  }
  render(<Harness />, { wrapper });
  return { services, onFinish };
}

const toys = () => [...document.querySelectorAll<HTMLElement>('button[data-brinquedo]')];
const box = (color: string) =>
  screen.getByRole('button', { name: color === 'azul' ? 'Caixa azul' : 'Caixa vermelha' });

function put(toy: HTMLElement, color: string) {
  fireEvent.click(toy);
  fireEvent.click(box(color));
}

describe('Game (US7, FR-021..023)', () => {
  it('6 brinquedos e 2 caixas como alvos infantis, e o botão voltar', () => {
    setup();
    expect(toys()).toHaveLength(6);
    for (const t of toys()) {
      expect(t).toHaveAttribute('data-alvo-infantil');
      expect(['azul', 'vermelho']).toContain(t.getAttribute('data-cor'));
    }
    expect(box('azul')).toHaveAttribute('data-alvo-infantil');
    expect(box('vermelho')).toHaveAttribute('data-alvo-infantil');
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveAttribute('data-alvo-infantil');
    expect(document.querySelector('[data-tela="jogo"]')).not.toBeNull();
  });

  it('acerto: som de acerto (sons ligados), progresso visual avança', () => {
    const { services } = setup(true);
    const toy = toys()[0]!;
    put(toy, toy.getAttribute('data-cor')!);
    expect(services.sound.play).toHaveBeenCalledWith(
      'acerto',
      expect.objectContaining({ sounds: true }),
    );
    expect(document.querySelectorAll('.progresso-jogo [data-cheio="true"]')).toHaveLength(1);
    expect(toys()).toHaveLength(5);
  });

  it('erro: incentivo do mascote, sem som de erro e sem perder progresso', () => {
    const { services } = setup(true);
    const toy = toys()[0]!;
    const wrong = toy.getAttribute('data-cor') === 'azul' ? 'vermelho' : 'azul';
    put(toy, wrong);
    expect(screen.getByRole('status')).toHaveTextContent(PHRASES.gameEncourage);
    expect(services.sound.play).not.toHaveBeenCalled();
    expect(toys()).toHaveLength(6);
    expect(document.querySelectorAll('.progresso-jogo [data-cheio="true"]')).toHaveLength(0);
  });

  it('sons desligados: o acerto é pedido em silêncio', () => {
    const { services } = setup(false);
    const toy = toys()[0]!;
    put(toy, toy.getAttribute('data-cor')!);
    expect(services.sound.play).toHaveBeenCalledWith(
      'acerto',
      expect.objectContaining({ sounds: false }),
    );
  });

  it('seis guardados: mascote festeja e volta ao mundo em ~3 s', () => {
    const { onFinish } = setup();
    while (toys().length > 0) {
      const toy = toys()[0]!;
      put(toy, toy.getAttribute('data-cor')!);
    }
    expect(screen.getByRole('img', { name: /Vaga-lume/ })).toHaveAttribute(
      'data-humor',
      'festejando',
    );
    expect(screen.getByRole('status')).toHaveTextContent(PHRASES.gameCelebrate);
    expect(onFinish).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(CELEBRATION_MS));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('voltar chama onFinish na hora', () => {
    const { onFinish } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
