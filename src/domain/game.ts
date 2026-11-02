// Jogo "Guardar os brinquedos" (FR-021..023): tocar o brinquedo e depois a caixa da mesma cor.
// Sem penalidade: errar só devolve o brinquedo ao lugar.

import { randomInt, shuffle, type RandomSource } from './sampling';

export type ToyColor = 'azul' | 'vermelho';
export type Toy = { id: string; kind: string; color: ToyColor; stored: boolean };
export type GameState = { toys: Toy[]; selected: string | null; progress: number };
export type DropResult = 'guardado' | 'incentivo' | 'nada';

export const TOY_COUNT = 6;

function colorOf(value: number): ToyColor {
  return value < 0.5 ? 'azul' : 'vermelho';
}

/** Garante ao menos um brinquedo de cada cor, trocando a cor de um sorteado. */
function ensureBothColors(toys: Toy[], source: RandomSource): Toy[] {
  if (new Set(toys.map((t) => t.color)).size === 2) {
    return toys;
  }
  const index = randomInt(0, toys.length - 1, source);
  return toys.map((t, i) =>
    i === index ? { ...t, color: t.color === 'azul' ? 'vermelho' : 'azul' } : t,
  );
}

export function newGame(kinds: readonly string[], source: RandomSource): GameState {
  const toys = shuffle(kinds, source).map((kind) => ({
    id: kind,
    kind,
    color: colorOf(source()),
    stored: false,
  }));
  return { toys: ensureBothColors(toys, source), selected: null, progress: 0 };
}

export function select(state: GameState, id: string): GameState {
  const toy = state.toys.find((t) => t.id === id);
  return toy && !toy.stored ? { ...state, selected: id } : state;
}

export function drop(state: GameState, box: ToyColor): [GameState, DropResult] {
  const toy = state.toys.find((t) => t.id === state.selected);
  if (!toy) {
    return [state, 'nada'];
  }
  if (toy.color !== box) {
    return [{ ...state, selected: null }, 'incentivo'];
  }
  const toys = state.toys.map((t) => (t.id === toy.id ? { ...t, stored: true } : t));
  return [{ toys, selected: null, progress: state.progress + 1 }, 'guardado'];
}

export function isFinished(state: GameState): boolean {
  return state.progress >= state.toys.length;
}
