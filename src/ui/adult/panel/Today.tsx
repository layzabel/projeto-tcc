'use client';

// Aba Hoje (FR-035): tempo usado, tempo restante, estado do dia e "Encerrar agora".

import { useState } from 'react';
import { SUPERVISION_GUIDANCE } from '../../../content/consent';
import { remainingSeconds } from '../../../domain/day';
import type { CompleteDocument, CurrentDay } from '../../../domain/model';
import { dayStatus, requestCloseNow } from '../../../domain/settings';
import type { AppStore } from '../../state/store';
import { Ring } from '../../shared/Ring';
import { ConfirmDialog } from '../ConfirmDialog';

type Props = { doc: CompleteDocument; store: AppStore; onClose: () => void };

const CLOSURE_LABEL: Readonly<Record<CurrentDay['closure'], string>> = {
  'nao-iniciado': 'Não ocorreu',
  'em-andamento': 'Em andamento',
  concluido: 'Ocorreu',
};

function remainingLabel(day: CurrentDay): string {
  const minutes = Math.ceil(remainingSeconds(day) / 60);
  return minutes === 1 ? 'Falta 1 minuto' : `Faltam ${minutes} minutos`;
}

export function Today({ doc, store, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const day = doc.currentDay;
  const status = dayStatus(day);
  const canClose = day.closure === 'nao-iniciado';

  const closeNow = () => {
    store.update(requestCloseNow);
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <h2>Hoje</h2>
      <Ring used={Math.floor(day.usedSeconds / 60)} limit={day.limitMin} />
      <dl className="resumo">
        <dt>Tempo restante</dt>
        <dd>{remainingLabel(day)}</dd>
        <dt>Estado do dia</dt>
        <dd>{status === 'encerrado' ? 'Encerrado' : 'Em uso'}</dd>
        <dt>Encerramento</dt>
        <dd>{CLOSURE_LABEL[day.closure]}</dd>
      </dl>
      <p className="sbp">{SUPERVISION_GUIDANCE}</p>
      {confirming ? (
        <ConfirmDialog
          title="Encerrar o tempo de tela agora?"
          confirmLabel="Confirmar encerramento"
          onConfirm={closeNow}
          onCancel={() => setConfirming(false)}
        >
          O encerramento começa agora e a tela fica bloqueada até amanhã. Não é possível liberar o
          tempo de novo hoje.
        </ConfirmDialog>
      ) : (
        <div className="acoes">
          <button
            type="button"
            className="botao"
            disabled={!canClose}
            onClick={() => setConfirming(true)}
          >
            Encerrar agora
          </button>
        </div>
      )}
    </>
  );
}
