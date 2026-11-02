import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isComplete, type Credential } from '@/domain/model';
import { sequenceSource } from '@/platform/random';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { PinEntry } from '@/ui/adult/PinEntry';
import { Recovery } from '@/ui/adult/Recovery';
import { createStore } from '@/ui/state/store';
import { HASH, MemoryStorage, makeDoc, SALT } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };
const credential: Credential = {
  algorithm: 'PBKDF2-SHA-256',
  iterations: 210000,
  salt: SALT,
  hash: HASH,
};
// Verificação falsa: a senha certa é 1234 para a credencial original, 5678 para a nova.
const NEW_HASH = 'n'.repeat(43) + '=';
const verify = vi.fn(async (pin: string, cred: Credential) =>
  cred.hash === HASH ? pin === '1234' : pin === '5678',
);
const makeCredential = vi.fn(async () => ({ ...credential, hash: NEW_HASH }));

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

async function typePin(pin: string) {
  await act(async () => {
    for (const d of pin) {
      click(d);
    }
  });
}

describe('PinEntry (FR-031)', () => {
  function setup() {
    const { services, wrapper } = fakeServices();
    const onSuccess = vi.fn();
    const onForgot = vi.fn();
    const onBack = vi.fn();
    render(
      <PinEntry
        credential={credential}
        onSuccess={onSuccess}
        onForgot={onForgot}
        onBack={onBack}
        verify={verify}
      />,
      { wrapper },
    );
    return { services, onSuccess, onForgot, onBack };
  }

  it('senha certa abre o painel', async () => {
    const { onSuccess } = setup();
    await typePin('1234');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('senha errada mostra mensagem, vibra e limpa os dígitos', async () => {
    const { onSuccess, services } = setup();
    await typePin('9999');
    expect(screen.getByRole('alert')).toHaveTextContent('Senha incorreta');
    expect(services.vibrate).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-cheio="true"]')).toHaveLength(0);
  });

  it('"Esqueci a senha" e voltar', () => {
    const { onForgot, onBack } = setup();
    click('Esqueci a senha');
    click('Voltar');
    expect(onForgot).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});

describe('Recovery (FR-032, SC-008)', () => {
  function setup() {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc()));
    const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
    store.start();
    const { wrapper } = fakeServices({ random: sequenceSource([0, 0, 0.5, 0.5]) });
    const onDone = vi.fn();
    const onBack = vi.fn();
    render(
      <Recovery store={store} onDone={onDone} onBack={onBack} makeCredential={makeCredential} />,
      { wrapper },
    );
    const stored = () => {
      const doc = store.getSnapshot();
      return isComplete(doc) ? doc.credential : null;
    };
    return { onDone, onBack, stored };
  }

  const answer = (value: string) => {
    fireEvent.change(screen.getByLabelText(/Resultado/), { target: { value } });
    click('Confirmar');
  };

  it('mostra uma soma e nenhum dado pessoal é pedido', () => {
    setup();
    expect(screen.getByText('Quanto é 20 + 20?')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('resposta errada gera nova conta e não muda a senha', () => {
    const { stored } = setup();
    answer('39');
    expect(screen.getByRole('alert')).toHaveTextContent(/errad/i);
    expect(screen.getByText('Quanto é 35 + 35?')).toBeInTheDocument();
    expect(stored()?.hash).toBe(HASH);
  });

  it('resposta certa permite criar e confirmar a nova senha, e a antiga deixa de valer', async () => {
    const { stored, onDone } = setup();
    answer('40');
    await typePin('5678');
    await typePin('5678');
    expect(makeCredential).toHaveBeenCalledWith('5678');
    expect(stored()?.hash).toBe(NEW_HASH);
    expect(onDone).toHaveBeenCalled();
    await expect(verify('1234', stored()!)).resolves.toBe(false);
    await expect(verify('5678', stored()!)).resolves.toBe(true);
  });
});
