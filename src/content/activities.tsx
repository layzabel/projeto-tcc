// Cartões de atividades do mundo real oferecidos no encerramento (FR-027).

import type { ReactNode } from 'react';

export type Activity = { id: string; label: string; reaction: string; icon: ReactNode };

const common = { viewBox: '0 0 64 64', 'aria-hidden': true, focusable: false } as const;

export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'brinquedo',
    label: 'Brincar com um brinquedo',
    reaction: 'Oba! Qual brinquedo você vai pegar?',
    icon: (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" fill="#e2553f" stroke="#1f2933" strokeWidth="2" />
        <path d="M10 32h44M32 10v44" stroke="#ffffff" strokeWidth="4" />
      </svg>
    ),
  },
  {
    id: 'desenhar',
    label: 'Desenhar',
    reaction: 'Que legal! Desenhe um vaga-lume para mim!',
    icon: (
      <svg {...common}>
        <path d="M14 50l6-16 26-26 10 10-26 26z" fill="#f2b705" stroke="#1f2933" strokeWidth="2" />
        <path d="M14 50l6-16 10 10z" fill="#1f2933" />
      </svg>
    ),
  },
  {
    id: 'abraco',
    label: 'Dar um abraço em quem cuida de você',
    reaction: 'Que abraço gostoso! Eu adoro abraços.',
    icon: (
      <svg {...common}>
        <path
          d="M32 54S8 40 8 24a12 12 0 0124-4 12 12 0 0124 4c0 16-24 30-24 30z"
          fill="#e2553f"
          stroke="#1f2933"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    id: 'livro',
    label: 'Ver um livro',
    reaction: 'Adoro livros! Escolha um bem bonito.',
    icon: (
      <svg {...common}>
        <rect
          x="10"
          y="12"
          width="44"
          height="40"
          rx="4"
          fill="#2f78d6"
          stroke="#1f2933"
          strokeWidth="2"
        />
        <path d="M32 12v40" stroke="#ffffff" strokeWidth="3" />
      </svg>
    ),
  },
];
