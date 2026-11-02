// Brinquedos do jogo, desenhados em SVG inline e pintados com a cor sorteada (FR-021).

import type { ReactNode } from 'react';
import type { ToyColor } from '../domain/game';

export const TOY_COLORS: Readonly<Record<ToyColor, { fill: string; label: string }>> = {
  azul: { fill: '#1d5fbf', label: 'azul' },
  vermelho: { fill: '#b8261d', label: 'vermelho' },
};

const stroke = { stroke: '#1f2933', strokeWidth: 2 } as const;

type ToyKind = { id: string; name: string; draw: (fill: string) => ReactNode };

export const TOY_KINDS: readonly ToyKind[] = [
  {
    id: 'bola',
    name: 'Bola',
    draw: (fill) => <circle cx="32" cy="32" r="22" fill={fill} {...stroke} />,
  },
  {
    id: 'urso',
    name: 'Ursinho',
    draw: (fill) => (
      <g fill={fill} {...stroke}>
        <circle cx="18" cy="16" r="7" />
        <circle cx="46" cy="16" r="7" />
        <circle cx="32" cy="34" r="20" />
      </g>
    ),
  },
  {
    id: 'carrinho',
    name: 'Carrinho',
    draw: (fill) => (
      <g {...stroke}>
        <rect x="8" y="22" width="48" height="20" rx="6" fill={fill} />
        <circle cx="20" cy="46" r="7" fill="#1f2933" />
        <circle cx="44" cy="46" r="7" fill="#1f2933" />
      </g>
    ),
  },
  {
    id: 'bloco',
    name: 'Bloco',
    draw: (fill) => <rect x="12" y="12" width="40" height="40" rx="4" fill={fill} {...stroke} />,
  },
  {
    id: 'pato',
    name: 'Patinho',
    draw: (fill) => (
      <g fill={fill} {...stroke}>
        <ellipse cx="30" cy="40" rx="20" ry="13" />
        <circle cx="42" cy="22" r="10" />
        <path d="M51 22l9 3-9 3z" fill="#f2b705" />
      </g>
    ),
  },
  {
    id: 'piao',
    name: 'Pião',
    draw: (fill) => <path d="M12 22h40L32 56z M28 8h8v14h-8z" fill={fill} {...stroke} />,
  },
];

export const TOY_KIND_IDS: readonly string[] = TOY_KINDS.map((k) => k.id);

export function toyKind(id: string): ToyKind {
  return TOY_KINDS.find((k) => k.id === id) ?? TOY_KINDS[0]!;
}
