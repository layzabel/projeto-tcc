'use client';

// Mundo da criança (US2): mascote, três botões grandes e o tempo restante sem números.

import { useEffect, useRef, useState } from 'react';
import { AFFECTIONATE_PHRASES, PHRASES } from '../../content/phrases';
import { exhausted } from '../../domain/day';
import type { CompleteDocument } from '../../domain/model';
import {
  firefliesLit,
  mascotMood,
  remainingMinutesLabel,
  skyPhase,
  sunPosition,
} from '../../domain/progress';
import type { ChildScreen } from '../../domain/screen';
import { pick } from '../../platform/random';
import { useServices } from '../state/services';
import type { AppStore } from '../state/store';
import { useAlmostDoneWarning } from '../state/useAlmostDoneWarning';
import { BigButton } from '../shared/BigButton';
import { Fireflies } from '../shared/Fireflies';
import { HoldButton } from '../shared/HoldButton';
import { BookIcon, FireflyIcon, PlayIcon } from '../shared/icons';
import { Mascot } from '../shared/Mascot';
import { Sky } from '../shared/Sky';
import { SpeechBubble } from '../shared/SpeechBubble';

type Props = {
  doc: CompleteDocument;
  store: AppStore;
  onOpen: (screen: Exclude<ChildScreen, 'mundo'>) => void;
  onAdult: () => void;
};

type Tapped = { text: string; afterWarning: boolean };

export function World({ doc, store, onOpen, onAdult }: Props) {
  const { speech, random } = useServices();
  const day = doc.currentDay;
  const { warningMin, voice } = doc.settings;
  // Decidido na montagem: o convite aparece só na primeira abertura do dia (FR-006a).
  const [invite] = useState(() => !day.supervisionInviteShown);
  const [tapped, setTapped] = useState<Tapped | null>(null);
  const greeted = useRef(false);
  const greeting = PHRASES.greeting(doc.profile.nickname);
  const opening = invite ? `${greeting} ${PHRASES.supervisionInvite}` : greeting;

  useAlmostDoneWarning(doc, store);

  useEffect(() => {
    if (greeted.current) {
      return;
    }
    greeted.current = true;
    speech.speak(opening, { voice });
    if (invite) {
      store.update((current) => ({
        ...current,
        currentDay: { ...current.currentDay, supervisionInviteShown: true },
      }));
    }
  }, [invite, opening, speech, store, voice]);

  const showWarning = day.warningPlayed && !tapped?.afterWarning;
  const text = showWarning ? PHRASES.almostDone : (tapped?.text ?? opening);
  const phase = skyPhase(day);

  const talk = () => {
    const phrase = pick(AFFECTIONATE_PHRASES, random);
    setTapped({ text: phrase, afterWarning: day.warningPlayed });
    speech.speak(phrase, { voice });
  };

  return (
    <main data-tela="mundo" className="tela-infantil" data-fundo={phase}>
      <Sky phase={phase} sun={sunPosition(day)} />
      <HoldButton onComplete={onAdult} />
      <div className="conteudo-infantil">
        <Fireflies lit={firefliesLit(day)} />
        <SpeechBubble text={text} />
        <Mascot mood={mascotMood(day, warningMin)} />
        {day.warningPlayed && !exhausted(day) && (
          <p className="texto-adulto">{remainingMinutesLabel(day)}</p>
        )}
        <div className="botoes-infantis">
          <BigButton label="Brincar" onClick={() => onOpen('jogo')}>
            <PlayIcon />
          </BigButton>
          <BigButton label="História" onClick={() => onOpen('historia')}>
            <BookIcon />
          </BigButton>
          <BigButton label="Mascote" onClick={talk}>
            <FireflyIcon />
          </BigButton>
        </div>
      </div>
    </main>
  );
}
