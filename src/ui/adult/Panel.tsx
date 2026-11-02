'use client';

// Painel do responsável: três abas, recomendação da SBP em todas (FR-034) e aviso persistente
// quando o aparelho não consegue salvar (Edge Cases).

import type { KeyboardEvent, ReactNode } from 'react';
import { SBP_RECOMMENDATION } from '../../content/consent';
import type { PanelTab } from '../state/session';

const TABS: readonly { id: PanelTab; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ajustes', label: 'Ajustes' },
  { id: 'registro', label: 'Registro' },
];

type Props = {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onBack: () => void;
  saveFailed: boolean;
  children: ReactNode;
};

export function Panel({ tab, onTab, onBack, saveFailed, children }: Props) {
  // Padrão de abas do WAI-ARIA: setas esquerda/direita trocam de aba.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step === undefined) {
      return;
    }
    const current = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(current + step + TABS.length) % TABS.length]!;
    onTab(next.id);
    document.getElementById(`aba-${next.id}`)?.focus();
  };

  return (
    <div
      className="tela-adulto"
      data-tela="painel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="painel-titulo"
    >
      <h1 id="painel-titulo">Painel do responsável</h1>
      {saveFailed && (
        <p className="aviso-salvar" role="alert">
          Não foi possível salvar os dados neste aparelho. A aplicação vai tentar de novo.
        </p>
      )}
      <p className="sbp">{SBP_RECOMMENDATION}</p>
      <div className="abas" role="tablist" aria-label="Seções do painel" onKeyDown={onKeyDown}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`aba-${id}`}
            aria-selected={tab === id}
            aria-controls={`painel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={`painel-${tab}`} aria-labelledby={`aba-${tab}`}>
        {children}
      </section>
      <div className="acoes">
        <button type="button" className="botao botao-secundario" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
