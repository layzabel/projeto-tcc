import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SBP_RECOMMENDATION, SUPERVISION_GUIDANCE } from '@/content/consent';
import type { Credential } from '@/domain/model';
import { LOADING } from '@/domain/screen';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { Setup } from '@/ui/adult/Setup';
import { createStore } from '@/ui/state/store';
import { HASH, MemoryStorage, SALT } from '../../../../helpers/docs';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };
const fakeCredential: Credential = {
  algorithm: 'PBKDF2-SHA-256',
  iterations: 210000,
  salt: SALT,
  hash: HASH,
};

function setup() {
  const storage = new MemoryStorage();
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const makeCredential = vi.fn(async () => fakeCredential);
  render(<Setup store={store} clock={clock} makeCredential={makeCredential} />);
  return { storage, store, makeCredential };
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

function typePin(pin: string) {
  for (const d of pin) {
    click(d);
  }
}

async function goToPin(nickname = 'Lia', limit = '45 minutos') {
  click('Começar a configuração');
  click('Aceito');
  fireEvent.change(screen.getByLabelText('Apelido ou primeiro nome (opcional)'), {
    target: { value: nickname },
  });
  click('Continuar');
  fireEvent.click(screen.getByLabelText(limit));
  click('Continuar');
}

describe('Setup (US1)', () => {
  it('começa nas boas-vindas, sem tela infantil', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Boas-vindas/);
    expect(document.querySelector('[data-alvo-infantil]')).toBeNull();
  });

  it('sem aceite não avança e nada é gravado', () => {
    const { storage } = setup();
    click('Começar a configuração');
    expect(screen.getByRole('heading', { name: /quais dados, para quê/i })).toBeInTheDocument();
    click('Não aceito');
    expect(screen.getByRole('alert')).toHaveTextContent(/sem o seu aceite/i);
    expect(screen.getByRole('button', { name: 'Aceito' })).toBeInTheDocument();
    expect(storage).toHaveLength(0);
  });

  it('aceite grava só o consentimento', () => {
    const { storage } = setup();
    click('Começar a configuração');
    click('Aceito');
    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(Object.keys(saved).sort()).toEqual(['consent', 'schemaVersion', 'setupCompleted']);
    expect(saved.consent.textVersion).toBe('1.0');
    expect(saved.setupCompleted).toBe(false);
  });

  it('campo de apelido: orientação visível, maxLength 18 e vazio permitido', () => {
    setup();
    click('Começar a configuração');
    click('Aceito');
    const input = screen.getByLabelText('Apelido ou primeiro nome (opcional)');
    expect(input).toHaveAttribute('maxLength', '18');
    expect(screen.getByText(/não informe o nome completo/i)).toBeVisible();
    click('Continuar');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/limite/i);
  });

  it('limite inicia em 60, mostra a SBP e só oferece 15..60 de 5 em 5', () => {
    setup();
    click('Começar a configuração');
    click('Aceito');
    click('Continuar');
    expect(screen.getByLabelText('60 minutos')).toBeChecked();
    expect(screen.getByText(SBP_RECOMMENDATION)).toBeInTheDocument();
    const values = screen.getAllByRole('radio').map((r) => Number((r as HTMLInputElement).value));
    expect(values).toEqual([15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  });

  it('confirmação diferente mostra erro e não grava a senha', async () => {
    const { storage, makeCredential } = setup();
    await goToPin();
    typePin('1234');
    typePin('4321');
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não coincidem');
    expect(makeCredential).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).credential).toBeUndefined();
  });

  it('conclusão mostra a orientação de uso supervisionado e grava tudo de uma vez', async () => {
    const { storage, store, makeCredential } = setup();
    await goToPin();
    typePin('1234');
    await act(async () => {
      typePin('1234');
    });
    expect(makeCredential).toHaveBeenCalledWith('1234');
    expect(screen.getByText(SUPERVISION_GUIDANCE)).toBeInTheDocument();
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).setupCompleted).toBe(false);
    const writes = storage.setCalls;
    click('Começar');
    expect(storage.setCalls).toBe(writes + 1);
    const doc = store.getSnapshot();
    expect(doc).not.toBe(LOADING);
    expect(doc).toMatchObject({
      setupCompleted: true,
      profile: { nickname: 'Lia' },
      settings: { dailyLimitMin: 45 },
      credential: fakeCredential,
      currentDay: { date: '2026-11-01', limitMin: 45, usedSeconds: 0 },
    });
  });
});
