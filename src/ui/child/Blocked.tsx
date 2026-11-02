'use client';

// Tela de bloqueio (FR-029): céu noturno, mascote dormindo e só o acesso do adulto. Termina
// sozinha na virada do dia (useDayRollover no App).

import { useEffect, useState } from 'react';
import { PHRASES } from '../../content/phrases';
import { msUntilMidnight } from '../../domain/dates';
import type { CompleteDocument } from '../../domain/model';
import { useServices } from '../state/services';
import { HoldButton } from '../shared/HoldButton';
import { Mascot } from '../shared/Mascot';
import { Sky } from '../shared/Sky';
import { SpeechBubble } from '../shared/SpeechBubble';

function untilMidnightLabel(now: Date): string {
  const minutes = Math.floor(msUntilMidnight(now) / 60_000);
  return `Faltam ${Math.floor(minutes / 60)} h ${minutes % 60} min para a meia-noite`;
}

type Props = { doc: CompleteDocument; onAdult: () => void };

export function Blocked({ onAdult }: Props) {
  const { clock } = useServices();
  const [label, setLabel] = useState(() => untilMidnightLabel(clock.now()));

  useEffect(() => {
    const id = setInterval(() => setLabel(untilMidnightLabel(clock.now())), 30_000);
    return () => clearInterval(id);
  }, [clock]);

  return (
    <main data-tela="bloqueio" className="tela-infantil" data-fundo="noite">
      <Sky phase="noite" />
      <HoldButton onComplete={onAdult} />
      <div className="conteudo-infantil">
        <SpeechBubble text={PHRASES.blocked} />
        <Mascot mood="dormindo" />
        <p className="texto-adulto">{label}</p>
      </div>
    </main>
  );
}
