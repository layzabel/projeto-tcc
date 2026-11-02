// Falas do mascote, todas em pt-BR (FR-005, FR-006, FR-006a, FR-009, FR-027).

export const AFFECTIONATE_PHRASES: readonly string[] = [
  'Eu gosto muito de brincar com você!',
  'Você é uma criança muito especial!',
  'Que sorriso bonito!',
  'Você me deixa feliz!',
  'Vamos ser amigos para sempre!',
  'Você brilha mais do que eu!',
];

export const PHRASES = {
  greeting: (name: string | null) =>
    name ? `Oi, ${name}! Que bom ver você!` : 'Oi! Que bom ver você!',
  supervisionInvite: 'Chame um adulto para brincar junto com você!',
  almostDone: 'Estou ficando com sono... falta pouquinho para a tela descansar.',
  closureWarning: (name: string | null) =>
    name
      ? `${name}, chegou a hora de guardar a tela. Vamos nos despedir?`
      : 'Chegou a hora de guardar a tela. Vamos nos despedir?',
  breatheIn: 'Puxa o ar devagarinho...',
  breatheOut: '...e solta bem devagar.',
  gameStart: 'Toque num brinquedo e depois na caixa da mesma cor!',
  gameEncourage: 'Quase! Tente a outra caixa.',
  gameCorrect: 'Isso! Guardou direitinho!',
  gameCelebrate: 'Você guardou todos os brinquedos! Viva!',
  praise: 'Você brincou muito bem hoje! Agora eu vou descansar.',
  chooseActivity: 'O que vamos fazer agora, longe da tela?',
  goodbye: 'Tchau! Até amanhã!',
  blocked: 'A tela foi descansar. Até amanhã!',
} as const;
