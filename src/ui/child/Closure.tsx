'use client';

// Encerramento lúdico (US3): etapas do estilo escolhido, uma execução por montagem. Cada etapa
// amarra falas, sons e temporizadores a um AbortController; desmontar (recarga, volta da área do
// adulto) cancela tudo, e a próxima montagem recomeça do aviso (R7, FR-028).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITIES, type Activity } from '../../content/activities';
import { PHRASES } from '../../content/phrases';
import {
  BREATH_PHASE_MS,
  closureSteps,
  finishClosure,
  startClosure,
  STEP_DURATION_MS,
  type ClosureStep,
} from '../../domain/closure';
import type { CompleteDocument } from '../../domain/model';
import type { Mood } from '../../domain/progress';
import { useServices } from '../state/services';
import type { AppStore } from '../state/store';
import { BigButton } from '../shared/BigButton';
import { HoldButton } from '../shared/HoldButton';
import { Mascot } from '../shared/Mascot';
import { Sky } from '../shared/Sky';
import { SpeechBubble } from '../shared/SpeechBubble';
import { Story } from './Story';

export const REACTION_MS = 3000;

type Props = { doc: CompleteDocument; store: AppStore; onAdult: () => void };

const STEP_MOOD: Readonly<Record<ClosureStep, Mood>> = {
  aviso: 'calmo',
  respiracao: 'calmo',
  historia: 'calmo',
  elogio: 'com-sono',
  escolha: 'calmo',
  despedida: 'dormindo',
};

function stepPhrase(step: ClosureStep, nickname: string | null, choice: Activity | null): string {
  const phrases: Record<ClosureStep, string> = {
    aviso: PHRASES.closureWarning(nickname),
    respiracao: PHRASES.breatheIn,
    historia: '',
    elogio: PHRASES.praise,
    escolha: choice ? choice.reaction : PHRASES.chooseActivity,
    despedida: PHRASES.goodbye,
  };
  return phrases[step];
}

/** Um ciclo de respiração guiada: inspira e solta. */
function Breathing({ voice, onDone }: { voice: boolean; onDone: () => void }) {
  const { speech } = useServices();
  const [phase, setPhase] = useState<'inspira' | 'solta'>('inspira');

  useEffect(() => {
    const controller = new AbortController();
    speech.speak(phase === 'inspira' ? PHRASES.breatheIn : PHRASES.breatheOut, {
      voice,
      signal: controller.signal,
    });
    const timer = setTimeout(
      () => (phase === 'inspira' ? setPhase('solta') : onDone()),
      BREATH_PHASE_MS,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [onDone, phase, speech, voice]);

  return (
    <div className="respiracao-bloco">
      <div className="respiracao" data-fase={phase} aria-hidden="true" />
      <p className="texto-adulto">{phase === 'inspira' ? 'Inspira…' : 'Solta…'}</p>
    </div>
  );
}

export function Closure({ doc, store, onAdult }: Props) {
  const { sound, speech } = useServices();
  const { voice, sounds, closureStyle } = doc.settings;
  const nickname = doc.profile.nickname;
  // O estilo vale para toda a execução, mesmo que o ajuste mude no meio.
  const [steps] = useState(() => closureSteps(closureStyle));
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Activity | null>(null);
  const started = useRef(false);
  const step = steps[index] ?? 'despedida';

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      store.update(startClosure);
    }
  }, [store]);

  useEffect(() => () => speech.cancelSpeech(), [speech]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    if (step === 'aviso') {
      sound.play('fim-de-tempo', { sounds, signal });
    }
    if (step !== 'respiracao' && step !== 'historia') {
      speech.speak(stepPhrase(step, nickname, null), { voice, signal });
    }
    const duration = step === 'respiracao' ? null : STEP_DURATION_MS[step];
    const advance =
      step === 'despedida' ? () => store.update(finishClosure) : () => setIndex((i) => i + 1);
    const timer = duration === null ? null : setTimeout(advance, duration);
    return () => {
      controller.abort();
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [index, nickname, sound, sounds, speech, step, store, voice]);

  useEffect(() => {
    if (!choice) {
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), REACTION_MS);
    return () => clearTimeout(timer);
  }, [choice]);

  const next = useCallback(() => setIndex((i) => i + 1), []);

  const choose = (activity: Activity) => {
    if (choice) {
      return;
    }
    setChoice(activity);
    sound.play('reacao', { sounds });
    speech.speak(activity.reaction, { voice });
  };

  return (
    <main data-tela="encerramento" data-etapa={step} className="tela-infantil" data-fundo="noite">
      {step !== 'historia' && <Sky phase="noite" />}
      <HoldButton onComplete={onAdult} />
      {step === 'historia' ? (
        <Story settings={doc.settings} onFinish={next} />
      ) : (
        <div className="conteudo-infantil">
          <SpeechBubble text={stepPhrase(step, nickname, choice)} />
          <Mascot mood={choice && step === 'escolha' ? 'feliz' : STEP_MOOD[step]} />
          {step === 'respiracao' && <Breathing key={index} voice={voice} onDone={next} />}
          {step === 'escolha' && (
            <div className="cartoes">
              {ACTIVITIES.map((activity) => (
                <BigButton
                  key={activity.id}
                  label={activity.label}
                  pressed={choice?.id === activity.id}
                  disabled={choice !== null && choice.id !== activity.id}
                  onClick={() => choose(activity)}
                >
                  {activity.icon}
                </BigButton>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
