'use client';

// Configuração inicial (US1): boas-vindas → consentimento → apelido → limite → senha → conclusão.
// Só o consentimento é gravado antes da conclusão; o resto vai numa única escrita no fim.

import { useState, type ReactNode } from 'react';
import { CONSENT_TEXT_VERSION } from '../../content/consent';
import { localDate } from '../../domain/dates';
import { DEFAULT_LIMIT } from '../../domain/limits';
import type { Credential, PendingDocument } from '../../domain/model';
import type { DocSnapshot } from '../../domain/screen';
import { acceptConsent, completeSetup } from '../../domain/setup';
import type { Clock } from '../../platform/clock';
import { createCredential } from '../../platform/credential';
import type { AppStore } from '../state/store';
import { Consent } from './setup/Consent';
import { Done } from './setup/Done';
import { Limit } from './setup/Limit';
import { Nickname } from './setup/Nickname';
import { Pin } from './setup/Pin';
import { Welcome } from './setup/Welcome';

function isPending(doc: DocSnapshot): doc is PendingDocument {
  return typeof doc === 'object' && doc !== null && !doc.setupCompleted;
}

type Step = 'boas-vindas' | 'consentimento' | 'apelido' | 'limite' | 'senha' | 'conclusao';

type Props = {
  store: AppStore;
  clock: Clock;
  makeCredential?: (pin: string) => Promise<Credential>;
};

export function Setup({ store, clock, makeCredential = createCredential }: Props) {
  const [step, setStep] = useState<Step>('boas-vindas');
  const [nickname, setNickname] = useState('');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [busy, setBusy] = useState(false);

  const accept = () => {
    store.write(() => acceptConsent(clock.now(), CONSENT_TEXT_VERSION));
    setStep('apelido');
  };

  const confirmPin = async (pin: string) => {
    setBusy(true);
    try {
      setCredential(await makeCredential(pin));
      setStep('conclusao');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    const doc = store.getSnapshot();
    if (!credential || !isPending(doc)) {
      // o consentimento foi apagado (por exemplo, em outra aba): recomeça do início
      setStep('boas-vindas');
      return;
    }
    const values = { nickname, dailyLimitMin: limit, credential };
    store.write(() => completeSetup(doc, values, localDate(clock.now())));
  };

  const screens: Record<Step, () => ReactNode> = {
    'boas-vindas': () => <Welcome onNext={() => setStep('consentimento')} />,
    consentimento: () => <Consent onAccept={accept} />,
    apelido: () => (
      <Nickname value={nickname} onChange={setNickname} onNext={() => setStep('limite')} />
    ),
    limite: () => <Limit value={limit} onChange={setLimit} onNext={() => setStep('senha')} />,
    senha: () => <Pin onConfirmed={(pin) => void confirmPin(pin)} busy={busy} />,
    conclusao: () => <Done onStart={finish} />,
  };

  return (
    <main data-tela="configuracao" data-passo={step} className="tela-adulto">
      {screens[step]()}
    </main>
  );
}
