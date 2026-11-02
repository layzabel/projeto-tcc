// Derivação da tela base a partir do estado (contracts/screens.md §1).

import { exhausted } from './day';
import { isComplete, type StoredDocument } from './model';

export const LOADING = 'carregando' as const;

export type ChildScreen = 'mundo' | 'jogo' | 'historia';

export type BaseScreen =
  'carregando' | 'configuracao' | 'mundo' | 'jogo' | 'historia' | 'encerramento' | 'bloqueio';

export type DocSnapshot = StoredDocument | null | typeof LOADING;

export function deriveScreen(doc: DocSnapshot, session: { childScreen: ChildScreen }): BaseScreen {
  if (doc === LOADING) {
    return 'carregando';
  }
  if (!isComplete(doc)) {
    return 'configuracao';
  }
  const day = doc.currentDay;
  if (day.closure === 'concluido') {
    return 'bloqueio';
  }
  if (day.closure === 'em-andamento' || exhausted(day)) {
    return 'encerramento';
  }
  return session.childScreen;
}

export function isChildUseScreen(screen: BaseScreen): screen is ChildScreen {
  return screen === 'mundo' || screen === 'jogo' || screen === 'historia';
}
