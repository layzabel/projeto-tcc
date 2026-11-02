import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isComplete, type Credential } from '@/domain/model';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { Settings } from '@/ui/adult/panel/Settings';
import { createStore, useAppState } from '@/ui/state/store';
import { HASH, MemoryStorage, makeDoc, type DocOverrides } from '../../../../helpers/docs';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };
const NEW_HASH = 'n'.repeat(43) + '=';

function setup(overrides: DocOverrides = {}) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc(overrides)));
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const onCleared = vi.fn();
  const verify = vi.fn(
    async (pin: string, cred: Credential) => cred.hash === HASH && pin === '1234',
  );
  const makeCredential = vi.fn(async (): Promise<Credential> => ({
    ...makeDoc().credential,
    hash: NEW_HASH,
  }));
  function Harness() {
    const doc = useAppState(store);
    return isComplete(doc) ? (
      <Settings
        doc={doc}
        store={store}
        onCleared={onCleared}
        verify={verify}
        makeCredential={makeCredential}
      />
    ) : null;
  }
  render(<Harness />);
  const doc = () => {
    const snap = store.getSnapshot();
    if (!isComplete(snap)) throw new Error('sem documento');
    return snap;
  };
  return { storage, store, onCleared, doc, makeCredential };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

async function typePin(pin: string) {
  await act(async () => {
    for (const d of pin) {
      click(d);
    }
  });
}

describe('aba Ajustes (FR-036)', () => {
  it('mostra o limite de hoje e o de amanhã; alterar vale só amanhã', () => {
    const { doc } = setup({ settings: { dailyLimitMin: 60 }, currentDay: { limitMin: 60 } });
    expect(screen.getByText('Hoje: 60 min · A partir de amanhã: 60 min')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('30 minutos'));
    expect(doc().settings.dailyLimitMin).toBe(30);
    expect(doc().currentDay.limitMin).toBe(60);
    expect(screen.getByText('Hoje: 60 min · A partir de amanhã: 30 min')).toBeInTheDocument();
  });

  it('recusa limite menor ou igual ao aviso', () => {
    const { doc } = setup({ settings: { warningMin: 15, dailyLimitMin: 60 } });
    fireEvent.click(screen.getByLabelText('15 minutos'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reduza o aviso antes de escolher este limite',
    );
    expect(doc().settings.dailyLimitMin).toBe(60);
  });

  it('aviso de 1 a 15 e menor que os dois limites', () => {
    const { doc } = setup({ settings: { dailyLimitMin: 15 }, currentDay: { limitMin: 60 } });
    const select = screen.getByLabelText('Aviso antes de acabar');
    fireEvent.change(select, { target: { value: '15' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(doc().settings.warningMin).toBe(5);
    fireEvent.change(select, { target: { value: '10' } });
    expect(doc().settings.warningMin).toBe(10);
  });

  it('estilo, sons, voz e menos animação', () => {
    const { doc } = setup();
    fireEvent.click(screen.getByLabelText('Historinha'));
    fireEvent.click(screen.getByLabelText('Sons'));
    fireEvent.click(screen.getByLabelText('Voz do mascote'));
    fireEvent.click(screen.getByLabelText('Menos animação'));
    expect(doc().settings).toMatchObject({
      closureStyle: 'historinha',
      sounds: false,
      voice: false,
      reducedMotion: true,
    });
  });

  it('nome com até 18 caracteres e orientação contra o nome completo', () => {
    const { doc } = setup();
    const input = screen.getByLabelText('Apelido ou primeiro nome (opcional)');
    expect(input).toHaveAttribute('maxLength', '18');
    expect(screen.getByText(/não informe o nome completo/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Bia' } });
    click('Salvar nome');
    expect(doc().profile.nickname).toBe('Bia');
  });

  it('trocar a senha recusa a senha atual errada', async () => {
    const { doc, makeCredential } = setup();
    click('Trocar a senha');
    await typePin('9999');
    expect(screen.getByRole('alert')).toHaveTextContent('Senha atual incorreta');
    await typePin('1234');
    await typePin('4321');
    await typePin('4321');
    expect(makeCredential).toHaveBeenCalledWith('4321');
    expect(doc().credential.hash).toBe(NEW_HASH);
    expect(screen.getByRole('status')).toHaveTextContent('Senha trocada');
  });

  it.each(['Apagar todos os dados', 'Retirar consentimento'])(
    '"%s" com confirmação apaga tudo (FR-039, FR-045)',
    (action) => {
      const { storage, onCleared, store } = setup();
      click(action);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      click('Cancelar');
      expect(storage).toHaveLength(1);
      click(action);
      click('Confirmar e apagar');
      expect(storage).toHaveLength(0);
      expect(store.getSnapshot()).toBeNull();
      expect(onCleared).toHaveBeenCalled();
    },
  );
});
