'use client';

// Teclado numérico próprio para a senha de 4 dígitos (FR-031), reutilizado na configuração,
// no acesso, na recuperação e na troca de senha.

import { useRef, useState } from 'react';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {
  label: string;
  onComplete: (pin: string) => void;
  disabled?: boolean;
};

export function PinPad({ label, onComplete, disabled = false }: Props) {
  const [digits, setDigitsState] = useState('');
  // Valor atual fora do ciclo de renderização: toques rápidos não perdem dígitos.
  const current = useRef('');

  const setDigits = (value: string) => {
    current.current = value;
    setDigitsState(value);
  };

  const press = (digit: string) => {
    const next = current.current + digit;
    if (next.length < PIN_LENGTH) {
      setDigits(next);
      return;
    }
    setDigits('');
    onComplete(next);
  };

  return (
    <div className="pin" role="group" aria-label={label}>
      <div className="pin-pontos" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} data-cheio={i < digits.length ? 'true' : 'false'} />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {digits.length} de {PIN_LENGTH} números digitados
      </p>
      <div className="pin-teclado">
        {KEYS.map((k) => (
          <button key={k} type="button" disabled={disabled} onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button
          type="button"
          aria-label="Apagar"
          disabled={disabled || digits.length === 0}
          onClick={() => setDigits(current.current.slice(0, -1))}
        >
          ⌫
        </button>
        <button type="button" disabled={disabled} onClick={() => press('0')}>
          0
        </button>
      </div>
    </div>
  );
}
