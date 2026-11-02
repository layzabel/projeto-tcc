'use client';

// Botão "sou o adulto": só aciona após 3 s contínuos de pressão (R14, FR-030).

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

export const HOLD_MS = 3000;

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = { onComplete: () => void; className?: string };

export function HoldButton({ onComplete, className }: Props) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stopTimers = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    stopTimers();
    setProgress(0);
  }, [stopTimers]);

  const start = useCallback(() => {
    if (timer.current !== null) {
      return;
    }
    startedAt.current = performance.now();
    timer.current = setTimeout(() => {
      stopTimers();
      setProgress(0);
      completeRef.current();
    }, HOLD_MS);
    // O anel é redesenhado a cada quadro pelo relógio monotônico.
    const draw = (): void => {
      setProgress(Math.min(1, (performance.now() - startedAt.current) / HOLD_MS));
      frame.current = requestAnimationFrame(draw);
    };
    frame.current = requestAnimationFrame(draw);
  }, [stopTimers]);

  useEffect(() => stopTimers, [stopTimers]);

  const isHoldKey = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter';

  return (
    <button
      type="button"
      className={['botao-adulto', className].filter(Boolean).join(' ')}
      aria-label="Sou o adulto: segure por 3 segundos"
      data-alvo-infantil=""
      data-progresso={progress === 0 ? '0' : progress.toFixed(2)}
      style={{ touchAction: 'none' }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (isHoldKey(e)) {
          e.preventDefault();
          if (!e.repeat) {
            start();
          }
        }
      }}
      onKeyUp={(e) => {
        if (isHoldKey(e)) {
          cancel();
        }
      }}
    >
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r={RADIUS} className="anel-fundo" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          className="anel-progresso"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          transform="rotate(-90 32 32)"
        />
        <circle cx="32" cy="25" r="6" className="icone-adulto" />
        <path d="M21 44c0-7 5-11 11-11s11 4 11 11" className="icone-adulto" />
      </svg>
    </button>
  );
}
