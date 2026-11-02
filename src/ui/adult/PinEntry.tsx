'use client';

// Senha do adulto no teclado próprio (FR-031): certa abre o painel; errada mostra mensagem,
// vibra quando há suporte e limpa os dígitos.

import { useState } from 'react';
import type { Credential } from '../../domain/model';
import { verifyCredential } from '../../platform/credential';
import { useServices } from '../state/services';
import { PinPad } from './PinPad';

const ERROR_VIBRATION_MS = 200;

type Props = {
  credential: Credential;
  onSuccess: () => void;
  onForgot: () => void;
  onBack: () => void;
  verify?: (pin: string, credential: Credential) => Promise<boolean>;
};

export function PinEntry({
  credential,
  onSuccess,
  onForgot,
  onBack,
  verify = verifyCredential,
}: Props) {
  const { vibrate } = useServices();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = async (pin: string) => {
    setBusy(true);
    const ok = await verify(pin, credential);
    setBusy(false);
    if (ok) {
      onSuccess();
      return;
    }
    setError(true);
    vibrate(ERROR_VIBRATION_MS);
  };

  return (
    <div className="tela-adulto" data-tela="senha">
      <h1 id="senha-titulo">Área dos adultos</h1>
      <p>Digite a senha de 4 números.</p>
      {error && (
        <p role="alert" className="erro">
          Senha incorreta
        </p>
      )}
      <PinPad label="Senha do adulto" onComplete={(pin) => void check(pin)} disabled={busy} />
      <div className="acoes">
        <button type="button" className="botao botao-secundario" onClick={onForgot}>
          Esqueci a senha
        </button>
        <button type="button" className="botao botao-secundario" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
