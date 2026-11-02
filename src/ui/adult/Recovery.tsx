'use client';

// "Esqueci a senha": uma soma de dois números sorteados; resposta certa permite criar uma
// nova senha (com sal novo), resposta errada gera outra conta (FR-032).

import { useState } from 'react';
import type { Credential } from '../../domain/model';
import { checkAnswer, newChallenge, type Challenge } from '../../domain/recovery';
import { createCredential } from '../../platform/credential';
import { useServices } from '../state/services';
import type { AppStore } from '../state/store';
import { NewPinEntry } from './setup/Pin';

type Props = {
  store: AppStore;
  onDone: () => void;
  onBack: () => void;
  makeCredential?: (pin: string) => Promise<Credential>;
};

export function Recovery({ store, onDone, onBack, makeCredential = createCredential }: Props) {
  const { random } = useServices();
  const [challenge, setChallenge] = useState<Challenge>(() => newChallenge(random));
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [solved, setSolved] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    if (checkAnswer(challenge, answer)) {
      setSolved(true);
      return;
    }
    setWrong(true);
    setAnswer('');
    setChallenge(newChallenge(random));
  };

  const savePin = async (pin: string) => {
    setBusy(true);
    const credential = await makeCredential(pin);
    store.update((doc) => ({ ...doc, credential }));
    setBusy(false);
    onDone();
  };

  return (
    <div className="tela-adulto" data-tela="recuperacao">
      <h1>Recuperar a senha</h1>
      {solved ? (
        <>
          <p>Resposta certa! Agora crie a nova senha.</p>
          <NewPinEntry onConfirmed={(pin) => void savePin(pin)} busy={busy} />
        </>
      ) : (
        <>
          <p>Para provar que você é um adulto, resolva a conta.</p>
          {wrong && (
            <p role="alert" className="erro">
              Resposta errada. Tente esta outra conta.
            </p>
          )}
          <p id="conta-pergunta" className="destaque">
            Quanto é {challenge.a} + {challenge.b}?
          </p>
          <div className="campo">
            <label htmlFor="conta">Resultado da conta</label>
            <input
              id="conta"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-describedby="conta-pergunta"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
          <div className="acoes">
            <button type="button" className="botao" onClick={confirm}>
              Confirmar
            </button>
          </div>
        </>
      )}
      <div className="acoes">
        <button type="button" className="botao botao-secundario" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
