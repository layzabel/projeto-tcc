'use client';

// Aba Ajustes (FR-036, FR-037, FR-038, FR-039, FR-045): cada seção valida e grava sozinha.

import { useState } from 'react';
import { WARNING_MAX, WARNING_MIN } from '../../../domain/limits';
import type {
  ClosureStyle,
  CompleteDocument,
  Credential,
  Settings as SettingsT,
} from '../../../domain/model';
import { applySettings, validateNewLimit, validateWarning } from '../../../domain/settings';
import { normalizeNickname } from '../../../domain/setup';
import { createCredential, verifyCredential } from '../../../platform/credential';
import type { AppStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { PinPad } from '../PinPad';
import { LimitOptions } from '../setup/Limit';
import { NicknameField } from '../setup/Nickname';
import { NewPinEntry } from '../setup/Pin';

type Props = {
  doc: CompleteDocument;
  store: AppStore;
  onCleared: () => void;
  verify?: (pin: string, credential: Credential) => Promise<boolean>;
  makeCredential?: (pin: string) => Promise<Credential>;
};

type SectionProps = { doc: CompleteDocument; store: AppStore };

const save = (store: AppStore, patch: Partial<SettingsT>) =>
  store.update((current) => applySettings(current, patch));

function LimitSection({ doc, store }: SectionProps) {
  const [error, setError] = useState<string | null>(null);
  const choose = (limit: number) => {
    const result = validateNewLimit(doc, limit);
    setError(result.ok ? null : result.message);
    if (result.ok) {
      save(store, { dailyLimitMin: limit });
    }
  };
  return (
    <section aria-labelledby="ajuste-limite">
      <h3 id="ajuste-limite">Limite diário</h3>
      <p>
        Hoje: {doc.currentDay.limitMin} min · A partir de amanhã: {doc.settings.dailyLimitMin} min
      </p>
      <p className="ajuda">Uma mudança no limite vale a partir do dia seguinte.</p>
      {error && (
        <p role="alert" className="erro">
          {error}
        </p>
      )}
      <LimitOptions
        value={doc.settings.dailyLimitMin}
        onChange={choose}
        legend="Limite diário a partir de amanhã"
        name="limite-ajuste"
      />
    </section>
  );
}

function WarningSection({ doc, store }: SectionProps) {
  const [error, setError] = useState<string | null>(null);
  const choose = (value: number) => {
    const result = validateWarning(doc, value);
    setError(result.ok ? null : result.message);
    if (result.ok) {
      save(store, { warningMin: value });
    }
  };
  const options = Array.from({ length: WARNING_MAX - WARNING_MIN + 1 }, (_, i) => WARNING_MIN + i);
  return (
    <section aria-labelledby="ajuste-aviso">
      <h3 id="ajuste-aviso">Aviso de “falta pouco”</h3>
      <div className="campo">
        <label htmlFor="aviso">Aviso antes de acabar</label>
        <select
          id="aviso"
          value={doc.settings.warningMin}
          onChange={(e) => choose(Number(e.target.value))}
        >
          {options.map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? 'minuto' : 'minutos'}
            </option>
          ))}
        </select>
        <span className="ajuda">De 1 a 15 minutos, menor que o limite de hoje e o de amanhã.</span>
      </div>
      {error && (
        <p role="alert" className="erro">
          {error}
        </p>
      )}
    </section>
  );
}

const STYLES: readonly { id: ClosureStyle; label: string }[] = [
  { id: 'respiracao', label: 'Respiração' },
  { id: 'historinha', label: 'Historinha' },
  { id: 'simples', label: 'Simples' },
];

function StyleSection({ doc, store }: SectionProps) {
  return (
    <section aria-labelledby="ajuste-estilo">
      <h3 id="ajuste-estilo">Estilo do encerramento</h3>
      <fieldset className="opcoes">
        <legend className="sr-only">Estilo do encerramento</legend>
        {STYLES.map(({ id, label }) => (
          <label key={id}>
            <input
              type="radio"
              name="estilo"
              value={id}
              checked={doc.settings.closureStyle === id}
              onChange={() => save(store, { closureStyle: id })}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </section>
  );
}

const TOGGLES: readonly {
  key: 'sounds' | 'voice' | 'reducedMotion';
  label: string;
  help: string;
}[] = [
  {
    key: 'sounds',
    label: 'Sons',
    help: 'Os avisos de “falta pouco” e de fim de tempo tocam sempre.',
  },
  { key: 'voice', label: 'Voz do mascote', help: 'Sem voz, as falas aparecem só no balão.' },
  { key: 'reducedMotion', label: 'Menos animação', help: 'Troca animações por imagens paradas.' },
];

function TogglesSection({ doc, store }: SectionProps) {
  return (
    <section aria-labelledby="ajuste-preferencias">
      <h3 id="ajuste-preferencias">Sons, voz e animação</h3>
      {TOGGLES.map(({ key, label, help }) => (
        <div key={key} className="interruptor">
          <input
            id={`ajuste-${key}`}
            type="checkbox"
            checked={doc.settings[key]}
            aria-describedby={`ajuste-${key}-ajuda`}
            onChange={(e) => save(store, { [key]: e.target.checked })}
          />
          <label htmlFor={`ajuste-${key}`}>{label}</label>
          <span id={`ajuste-${key}-ajuda`} className="ajuda">
            {help}
          </span>
        </div>
      ))}
    </section>
  );
}

function NicknameSection({ doc, store }: SectionProps) {
  const [value, setValue] = useState(doc.profile.nickname ?? '');
  const saveName = () =>
    store.update((current) => ({ ...current, profile: { nickname: normalizeNickname(value) } }));
  return (
    <section aria-labelledby="ajuste-nome">
      <h3 id="ajuste-nome">Nome da criança</h3>
      <NicknameField value={value} onChange={setValue} />
      <button type="button" className="botao botao-secundario" onClick={saveName}>
        Salvar nome
      </button>
    </section>
  );
}

type PinStep = 'fechado' | 'atual' | 'nova';

function PinSection({
  doc,
  store,
  verify,
  makeCredential,
}: SectionProps & Required<Pick<Props, 'verify' | 'makeCredential'>>) {
  const [step, setStep] = useState<PinStep>('fechado');
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkCurrent = async (pin: string) => {
    setBusy(true);
    const ok = await verify(pin, doc.credential);
    setBusy(false);
    setError(!ok);
    if (ok) {
      setStep('nova');
    }
  };

  const saveNew = async (pin: string) => {
    setBusy(true);
    const credential = await makeCredential(pin);
    store.update((current) => ({ ...current, credential }));
    setBusy(false);
    setStep('fechado');
    setDone(true);
  };

  return (
    <section aria-labelledby="ajuste-senha">
      <h3 id="ajuste-senha">Senha</h3>
      {done && <p role="status">Senha trocada</p>}
      {step === 'fechado' && (
        <button
          type="button"
          className="botao botao-secundario"
          onClick={() => {
            setDone(false);
            setStep('atual');
          }}
        >
          Trocar a senha
        </button>
      )}
      {step === 'atual' && (
        <>
          <p>Digite a senha atual.</p>
          {error && (
            <p role="alert" className="erro">
              Senha atual incorreta
            </p>
          )}
          <PinPad
            label="Senha atual"
            onComplete={(pin) => void checkCurrent(pin)}
            disabled={busy}
          />
        </>
      )}
      {step === 'nova' && <NewPinEntry onConfirmed={(pin) => void saveNew(pin)} busy={busy} />}
    </section>
  );
}

type EraseKind = 'apagar' | 'retirar';

function EraseSection({ store, onCleared }: { store: AppStore; onCleared: () => void }) {
  const [confirming, setConfirming] = useState<EraseKind | null>(null);
  const erase = () => {
    store.clear();
    onCleared();
  };
  return (
    <section aria-labelledby="ajuste-dados">
      <h3 id="ajuste-dados">Dados e consentimento</h3>
      {confirming ? (
        <ConfirmDialog
          title={confirming === 'apagar' ? 'Apagar todos os dados?' : 'Retirar o consentimento?'}
          confirmLabel="Confirmar e apagar"
          danger
          onConfirm={erase}
          onCancel={() => setConfirming(null)}
        >
          Tudo o que a aplicação guarda neste aparelho será apagado, inclusive o consentimento e o
          tempo usado hoje. A configuração inicial recomeça.
        </ConfirmDialog>
      ) : (
        <div className="acoes">
          <button
            type="button"
            className="botao botao-perigo"
            onClick={() => setConfirming('apagar')}
          >
            Apagar todos os dados
          </button>
          <button
            type="button"
            className="botao botao-secundario"
            onClick={() => setConfirming('retirar')}
          >
            Retirar consentimento
          </button>
        </div>
      )}
    </section>
  );
}

export function Settings({
  doc,
  store,
  onCleared,
  verify = verifyCredential,
  makeCredential = createCredential,
}: Props) {
  return (
    <>
      <h2>Ajustes</h2>
      <LimitSection doc={doc} store={store} />
      <WarningSection doc={doc} store={store} />
      <StyleSection doc={doc} store={store} />
      <TogglesSection doc={doc} store={store} />
      <NicknameSection doc={doc} store={store} />
      <PinSection doc={doc} store={store} verify={verify} makeCredential={makeCredential} />
      <EraseSection store={store} onCleared={onCleared} />
    </>
  );
}
