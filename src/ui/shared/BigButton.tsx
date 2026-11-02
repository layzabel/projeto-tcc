// Botão grande das telas infantis: só ícone, nome acessível em pt-BR, ≥ 64×64 px (FR-048, FR-049).

import type { ReactNode } from 'react';

type Props = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
  disabled?: boolean;
};

export function BigButton({ label, onClick, children, className, pressed, disabled }: Props) {
  return (
    <button
      type="button"
      className={['botao-grande', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      data-alvo-infantil=""
      onClick={onClick}
    >
      {children}
    </button>
  );
}
