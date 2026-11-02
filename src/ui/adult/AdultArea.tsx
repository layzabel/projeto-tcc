'use client';

// Sobreposição da área dos adultos: senha → painel, ou recuperação → nova senha → painel. Enquanto
// aberta, a contagem fica pausada (FR-012); fechar reavalia a tela base (FR-033).

import type { ReactNode } from 'react';
import type { CompleteDocument } from '../../domain/model';
import type { AdultOverlay, PanelTab } from '../state/session';
import type { AppStore } from '../state/store';
import { Panel } from './Panel';
import { PinEntry } from './PinEntry';
import { Recovery } from './Recovery';

type Props = {
  overlay: Exclude<AdultOverlay, 'fechado'>;
  doc: CompleteDocument;
  store: AppStore;
  onOverlay: (overlay: AdultOverlay) => void;
  onClose: () => void;
  renderTab: (tab: PanelTab) => ReactNode;
};

export function AdultArea({ overlay, doc, store, onOverlay, onClose, renderTab }: Props) {
  const openPanel = () => onOverlay({ painel: 'hoje' });

  const content = () => {
    if (overlay === 'senha') {
      return (
        <PinEntry
          credential={doc.credential}
          onSuccess={openPanel}
          onForgot={() => onOverlay('recuperacao')}
          onBack={onClose}
        />
      );
    }
    if (overlay === 'recuperacao') {
      return <Recovery store={store} onDone={openPanel} onBack={onClose} />;
    }
    return (
      <Panel
        tab={overlay.painel}
        onTab={(tab) => onOverlay({ painel: tab })}
        onBack={onClose}
        saveFailed={store.saveFailed()}
      >
        {renderTab(overlay.painel)}
      </Panel>
    );
  };

  return <div className="sobreposicao">{content()}</div>;
}
