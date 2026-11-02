'use client';

import { useState } from 'react';
import { PinPad } from '../PinPad';

type Props = { onConfirmed: (pin: string) => void; busy?: boolean };

/** Senha digitada duas vezes; só confirma quando as duas coincidem. */
export function NewPinEntry({ onConfirmed, busy = false }: Props) {
  const [first, setFirst] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const handle = (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setMismatch(false);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setMismatch(true);
      return;
    }
    onConfirmed(pin);
  };

  return (
    <>
      <p id="senha-instrucao">
        {first === null ? 'Digite uma senha de 4 números.' : 'Digite a mesma senha de novo.'}
      </p>
      {mismatch && (
        <p role="alert" className="erro">
          As senhas não coincidem
        </p>
      )}
      <PinPad
        key={first === null ? 'primeira' : 'confirmacao'}
        label={first === null ? 'Nova senha' : 'Confirmação da senha'}
        onComplete={handle}
        disabled={busy}
      />
      {busy && <p aria-live="polite">Guardando a senha com segurança…</p>}
    </>
  );
}

export function Pin(props: Props) {
  return (
    <>
      <h1>Crie a senha do adulto</h1>
      <p>
        A senha protege a área dos adultos. Ela é guardada em forma não legível e nunca aparece na
        exportação dos dados.
      </p>
      <NewPinEntry {...props} />
    </>
  );
}
