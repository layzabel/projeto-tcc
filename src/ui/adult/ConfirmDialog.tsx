'use client';

// Confirmação em linha para ações que não podem ser desfeitas.

import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="dialogo"
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="dialogo-titulo"
      aria-describedby="dialogo-texto"
    >
      <h3 id="dialogo-titulo">{title}</h3>
      <p id="dialogo-texto">{children}</p>
      <div className="acoes">
        <button
          type="button"
          className={danger ? 'botao botao-perigo' : 'botao'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="botao botao-secundario" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
