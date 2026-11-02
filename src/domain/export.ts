// Arquivo exportado (contracts/export-format.md): todos os dados gravados, com chaves em
// português, exceto a credencial (FR-041, FR-043).

import { isoLocal } from './dates';
import type { CompleteDocument } from './model';

export function toExport(doc: CompleteDocument, now: Date) {
  const { settings, currentDay } = doc;
  return {
    formato: 'controle-parental-exportacao',
    versaoFormato: 1,
    exportadoEm: isoLocal(now),
    consentimento: { aceitoEm: doc.consent.acceptedAt, versaoTexto: doc.consent.textVersion },
    crianca: { apelido: doc.profile.nickname },
    ajustes: {
      limiteDiarioMinutos: settings.dailyLimitMin,
      avisoMinutos: settings.warningMin,
      estiloEncerramento: settings.closureStyle,
      sons: settings.sounds,
      voz: settings.voice,
      menosAnimacao: settings.reducedMotion,
    },
    diaAtual: {
      data: currentDay.date,
      segundosUsados: currentDay.usedSeconds,
      limiteMinutos: currentDay.limitMin,
      avisoTocou: currentDay.warningPlayed,
      conviteSupervisaoFeito: currentDay.supervisionInviteShown,
      encerramento: currentDay.closure,
      encerramentoPedidoPeloResponsavel: currentDay.closureRequestedByAdult,
    },
    historico: doc.history.map((r) => ({
      data: r.date,
      segundosUsados: r.usedSeconds,
      limiteMinutos: r.limitMin,
      encerramentoAconteceu: r.closureHappened,
    })),
  };
}

export type ExportData = ReturnType<typeof toExport>;

export function serializeExport(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportFileName(date: string): string {
  return `controle-parental-dados-${date}.json`;
}
