// Encerramento lúdico: etapas por estilo e transições do dia (FR-026, FR-027, data-model).

import type { ClosureStyle, CompleteDocument } from './model';

export type ClosureStep = 'aviso' | 'respiracao' | 'historia' | 'elogio' | 'escolha' | 'despedida';

const STYLE_STEPS: Readonly<Record<ClosureStyle, readonly ClosureStep[]>> = {
  respiracao: ['respiracao', 'respiracao', 'respiracao'],
  historinha: ['historia'],
  simples: [],
};

export function closureSteps(style: ClosureStyle): ClosureStep[] {
  return ['aviso', ...STYLE_STEPS[style], 'elogio', 'escolha', 'despedida'];
}

/** Uma fase da respiração guiada (inspira ou solta). */
export const BREATH_PHASE_MS = 4000;

/** Duração das etapas que avançam por tempo; null = espera a interação da criança. */
export const STEP_DURATION_MS: Readonly<Record<ClosureStep, number | null>> = {
  aviso: 5000,
  respiracao: 2 * BREATH_PHASE_MS,
  historia: null,
  elogio: 5000,
  escolha: null,
  despedida: 4000,
};

function withClosure(
  doc: CompleteDocument,
  closure: CompleteDocument['currentDay']['closure'],
  requested = doc.currentDay.closureRequestedByAdult,
): CompleteDocument {
  return { ...doc, currentDay: { ...doc.currentDay, closure, closureRequestedByAdult: requested } };
}

/** Grava o início do encerramento; nunca reabre um dia já encerrado. */
export function startClosure(doc: CompleteDocument): CompleteDocument {
  return doc.currentDay.closure === 'nao-iniciado' ? withClosure(doc, 'em-andamento') : doc;
}

/** Fim da despedida: a tela passa ao bloqueio até a virada do dia. */
export function finishClosure(doc: CompleteDocument): CompleteDocument {
  return doc.currentDay.closure === 'concluido' ? doc : withClosure(doc, 'concluido');
}
