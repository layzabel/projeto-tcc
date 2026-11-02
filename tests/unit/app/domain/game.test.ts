import { describe, expect, it } from 'vitest';
import { drop, isFinished, newGame, select, TOY_COUNT, type GameState } from '@/domain/game';
import { random, sequenceSource } from '@/platform/random';

const KINDS = ['bola', 'urso', 'carrinho', 'bloco', 'pato', 'piao'] as const;

describe('newGame (FR-021)', () => {
  it('6 brinquedos, todos os tipos, cada um azul ou vermelho, com ao menos 1 de cada cor', () => {
    for (let i = 0; i < 200; i += 1) {
      const game = newGame(KINDS, random);
      expect(game.toys).toHaveLength(TOY_COUNT);
      expect(game.toys.map((t) => t.kind).sort()).toEqual([...KINDS].sort());
      const colors = new Set(game.toys.map((t) => t.color));
      expect(colors).toEqual(new Set(['azul', 'vermelho']));
      expect(game.progress).toBe(0);
      expect(game.selected).toBeNull();
    }
  });

  it('sorteio todo de uma cor ainda gera as duas cores', () => {
    const allLow = newGame(KINDS, sequenceSource([0]));
    expect(new Set(allLow.toys.map((t) => t.color)).size).toBe(2);
    const allHigh = newGame(KINDS, sequenceSource([0.99]));
    expect(new Set(allHigh.toys.map((t) => t.color)).size).toBe(2);
  });

  it('a ordem é aleatória (depende da fonte)', () => {
    const a = newGame(KINDS, sequenceSource([0.1, 0.9, 0.3, 0.7, 0.5]));
    const b = newGame(KINDS, sequenceSource([0.9, 0.1, 0.7, 0.3, 0.5]));
    expect(a.toys.map((t) => t.kind)).not.toEqual(b.toys.map((t) => t.kind));
  });
});

function fixedGame(): GameState {
  return {
    toys: KINDS.map((kind, i) => ({
      id: kind,
      kind,
      color: i % 2 === 0 ? 'azul' : 'vermelho',
      stored: false,
    })),
    selected: null,
    progress: 0,
  };
}

describe('select e drop (FR-022)', () => {
  it('caixa da mesma cor guarda e avança o progresso', () => {
    const [next, result] = drop(select(fixedGame(), 'bola'), 'azul');
    expect(result).toBe('guardado');
    expect(next.progress).toBe(1);
    expect(next.toys.find((t) => t.id === 'bola')!.stored).toBe(true);
    expect(next.selected).toBeNull();
  });

  it('caixa da outra cor devolve o brinquedo, incentiva e não perde progresso', () => {
    const [stored] = drop(select(fixedGame(), 'bola'), 'azul');
    const [next, result] = drop(select(stored, 'urso'), 'azul');
    expect(result).toBe('incentivo');
    expect(next.progress).toBe(1);
    expect(next.toys.find((t) => t.id === 'urso')!.stored).toBe(false);
    expect(next.selected).toBeNull();
  });

  it('caixa sem brinquedo selecionado não faz nada; guardado não pode ser selecionado', () => {
    const [same, result] = drop(fixedGame(), 'azul');
    expect(result).toBe('nada');
    expect(same.progress).toBe(0);
    const [stored] = drop(select(fixedGame(), 'bola'), 'azul');
    expect(select(stored, 'bola').selected).toBeNull();
  });

  it('isFinished com os 6 guardados', () => {
    let game = fixedGame();
    for (const toy of game.toys) {
      expect(isFinished(game)).toBe(false);
      [game] = drop(select(game, toy.id), toy.color);
    }
    expect(game.progress).toBe(6);
    expect(isFinished(game)).toBe(true);
  });
});
