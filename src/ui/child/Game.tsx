'use client';

// Jogo "Guardar os brinquedos" (US7). Conta tempo como tela infantil; sem pontos nem penalidade.

import { useEffect, useRef, useState } from 'react';
import { PHRASES } from '../../content/phrases';
import { TOY_COLORS, TOY_KIND_IDS, toyKind } from '../../content/toys';
import {
  drop,
  isFinished,
  newGame,
  select,
  type GameState,
  type ToyColor,
} from '../../domain/game';
import type { CompleteDocument } from '../../domain/model';
import { useServices } from '../state/services';
import type { AppStore } from '../state/store';
import { useAlmostDoneWarning } from '../state/useAlmostDoneWarning';
import { BigButton } from '../shared/BigButton';
import { BackIcon } from '../shared/icons';
import { Mascot } from '../shared/Mascot';
import { Sky } from '../shared/Sky';
import { SpeechBubble } from '../shared/SpeechBubble';

/** Tempo da comemoração antes de voltar sozinho ao mundo (FR-023). */
export const CELEBRATION_MS = 3000;

type Props = { doc: CompleteDocument; store: AppStore; onFinish: () => void };

const BOXES: readonly ToyColor[] = ['azul', 'vermelho'];

function BoxIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M8 24h48v32H8z" fill="none" stroke="#ffffff" strokeWidth="4" />
      <path d="M4 16h56v8H4z" fill="#ffffff" />
    </svg>
  );
}

export function Game({ doc, store, onFinish }: Props) {
  const { sound, speech, random } = useServices();
  const { sounds, voice } = doc.settings;
  const [game, setGame] = useState<GameState>(() => newGame(TOY_KIND_IDS, random));
  const [message, setMessage] = useState<string>(PHRASES.gameStart);
  const finished = isFinished(game);
  // O App renderiza a cada segundo de contagem: a ref evita reiniciar a comemoração.
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useAlmostDoneWarning(doc, store);

  useEffect(() => {
    if (!finished) {
      return;
    }
    const controller = new AbortController();
    speech.speak(PHRASES.gameCelebrate, { voice, signal: controller.signal });
    const timer = setTimeout(() => finishRef.current(), CELEBRATION_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [finished, speech, voice]);

  const putInBox = (box: ToyColor) => {
    const [next, result] = drop(game, box);
    setGame(next);
    if (result === 'guardado') {
      sound.play('acerto', { sounds });
      setMessage(isFinished(next) ? PHRASES.gameCelebrate : PHRASES.gameCorrect);
    } else if (result === 'incentivo') {
      setMessage(PHRASES.gameEncourage);
      speech.speak(PHRASES.gameEncourage, { voice });
    }
  };

  return (
    <main data-tela="jogo" className="tela-infantil" data-fundo="dia">
      <Sky phase="dia" sun={0.8} />
      <div className="botao-voltar">
        <BigButton label="Voltar" onClick={onFinish}>
          <BackIcon />
        </BigButton>
      </div>
      <div className="conteudo-infantil">
        <SpeechBubble text={message} />
        <Mascot mood={finished ? 'festejando' : 'feliz'} size={112} />
        <div
          className="progresso-jogo"
          role="img"
          aria-label={`Brinquedos guardados: ${game.progress} de ${game.toys.length}`}
        >
          {game.toys.map((t, i) => (
            <span key={t.id} data-cheio={i < game.progress ? 'true' : 'false'} />
          ))}
        </div>
        <div className="brinquedos">
          {game.toys.map((toy) => {
            if (toy.stored) {
              return <div key={toy.id} className="brinquedo-vazio" aria-hidden="true" />;
            }
            const kind = toyKind(toy.kind);
            return (
              <button
                key={toy.id}
                type="button"
                className={`botao-grande brinquedo-${toy.color}`}
                data-alvo-infantil=""
                data-brinquedo={toy.id}
                data-cor={toy.color}
                aria-label={`${kind.name} ${TOY_COLORS[toy.color].label}`}
                aria-pressed={game.selected === toy.id}
                onClick={() => setGame(select(game, toy.id))}
              >
                <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
                  {kind.draw(TOY_COLORS[toy.color].fill)}
                </svg>
              </button>
            );
          })}
        </div>
        <div className="caixas">
          {BOXES.map((color) => (
            <BigButton
              key={color}
              label={color === 'azul' ? 'Caixa azul' : 'Caixa vermelha'}
              className={`caixa caixa-${color === 'azul' ? 'azul' : 'vermelha'}`}
              onClick={() => putInBox(color)}
            >
              <BoxIcon />
            </BigButton>
          ))}
        </div>
      </div>
    </main>
  );
}
