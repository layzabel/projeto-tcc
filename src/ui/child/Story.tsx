'use client';

// História interativa de 6 páginas (US8): o 1º toque dispara o efeito, o 2º avança (FR-024,
// FR-025). Usada sozinha (tela "historia") e como etapa do estilo Historinha do encerramento.

import { useEffect, useState } from 'react';
import { STORY_PAGES, type StoryEffect } from '../../content/story';
import type { Settings } from '../../domain/model';
import type { Mood } from '../../domain/progress';
import type { SoundType } from '../../platform/sound';
import { useServices } from '../state/services';
import { HandIcon } from '../shared/icons';
import { Mascot } from '../shared/Mascot';
import { Sky } from '../shared/Sky';
import { SpeechBubble } from '../shared/SpeechBubble';

const EFFECT_SOUND: Readonly<Record<StoryEffect, SoundType>> = {
  risada: 'risada',
  'luz-enfraquecendo': 'luz',
  bocejo: 'bocejo',
  respiracao: 'respira',
  flores: 'flores',
  dormir: 'dormir',
};

const EFFECT_MOOD: Readonly<Record<StoryEffect, Mood>> = {
  risada: 'festejando',
  'luz-enfraquecendo': 'calmo',
  bocejo: 'com-sono',
  respiracao: 'calmo',
  flores: 'feliz',
  dormir: 'dormindo',
};

function EffectVisual({ effect }: { effect: StoryEffect }) {
  if (effect === 'flores') {
    return (
      <svg viewBox="0 0 96 32" width="96" height="32" aria-hidden="true" focusable="false">
        {[16, 48, 80].map((x) => (
          <g key={x}>
            <path d={`M${x} 32v-14`} stroke="#2f6f4f" strokeWidth="3" />
            <circle cx={x} cy="12" r="8" fill="#e86a9a" stroke="#1f2933" strokeWidth="2" />
          </g>
        ))}
      </svg>
    );
  }
  return <NextIcon />;
}

function NextIcon() {
  return (
    <svg
      className="dica-toque"
      viewBox="0 0 64 64"
      width="48"
      height="48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24 12l20 20-20 20"
        fill="none"
        stroke="#1f2933"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = { settings: Settings; onFinish: () => void; standalone?: boolean };

export function Story({ settings, onFinish, standalone = false }: Props) {
  const { sound, speech } = useServices();
  const [index, setIndex] = useState(0);
  const [effectShown, setEffectShown] = useState(false);
  const page = STORY_PAGES[index] ?? STORY_PAGES[0]!;
  const { voice, sounds } = settings;

  useEffect(() => {
    const controller = new AbortController();
    speech.speak(page.frase, { voice, signal: controller.signal });
    return () => controller.abort();
  }, [page.frase, speech, voice]);

  const tap = () => {
    if (!effectShown) {
      setEffectShown(true);
      sound.play(EFFECT_SOUND[page.efeito], { sounds });
      return;
    }
    if (index === STORY_PAGES.length - 1) {
      onFinish();
      return;
    }
    setIndex(index + 1);
    setEffectShown(false);
  };

  const content = (
    <>
      <Sky phase={page.cenario} sun={page.cenario === 'dia' ? 0.9 : 0.3} />
      <div className="conteudo-infantil">
        <SpeechBubble text={page.frase} />
        <button
          type="button"
          className="botao-grande pagina-historia"
          data-alvo-infantil=""
          data-efeito={effectShown ? page.efeito : undefined}
          aria-label={effectShown ? 'Próxima página' : 'Tocar na história'}
          onClick={tap}
        >
          <Mascot mood={effectShown ? EFFECT_MOOD[page.efeito] : 'calmo'} size={120} />
          {effectShown ? <EffectVisual effect={page.efeito} /> : <HandIcon />}
        </button>
        <p className="texto-adulto">
          Página {index + 1} de {STORY_PAGES.length}
        </p>
      </div>
    </>
  );

  if (!standalone) {
    return content;
  }
  return (
    <main data-tela="historia" className="tela-infantil" data-fundo={page.cenario}>
      {content}
    </main>
  );
}
