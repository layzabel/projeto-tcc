// História de 6 páginas sobre o mascote se preparando para descansar (FR-024).

import type { SkyPhase } from '../domain/progress';

export type StoryEffect =
  'risada' | 'luz-enfraquecendo' | 'bocejo' | 'respiracao' | 'flores' | 'dormir';

export type StoryPage = { cenario: SkyPhase; frase: string; efeito: StoryEffect };

export const STORY_PAGES: readonly StoryPage[] = [
  { cenario: 'dia', frase: 'O vaga-lume brincou o dia todo no jardim.', efeito: 'risada' },
  {
    cenario: 'tarde',
    frase: 'O sol foi ficando laranja, e a luz foi diminuindo.',
    efeito: 'luz-enfraquecendo',
  },
  { cenario: 'tarde', frase: 'O vaga-lume deu um bocejo bem grande.', efeito: 'bocejo' },
  { cenario: 'anoitecer', frase: 'Ele respirou fundo, bem devagarinho.', efeito: 'respiracao' },
  {
    cenario: 'anoitecer',
    frase: 'Nasceram florzinhas para enfeitar a caminha dele.',
    efeito: 'flores',
  },
  { cenario: 'noite', frase: 'Boa noite, vaga-lume! Hora de descansar.', efeito: 'dormir' },
];
