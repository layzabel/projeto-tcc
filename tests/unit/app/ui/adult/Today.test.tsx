import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SUPERVISION_GUIDANCE } from '@/content/consent';
import { isComplete } from '@/domain/model';
import { createRepository, STORAGE_KEY } from '@/storage/repository';
import { Today } from '@/ui/adult/panel/Today';
import { createStore, useAppState } from '@/ui/state/store';
import { MemoryStorage, makeDoc, type DocOverrides } from '../../../../helpers/docs';

const clock = { monotonic: () => 0, now: () => new Date(2026, 10, 1, 10) };

function setup(overrides: DocOverrides = {}) {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(makeDoc(overrides)));
  const store = createStore({ repository: createRepository(storage, new EventTarget()), clock });
  store.start();
  const onClose = vi.fn();
  function Harness() {
    const doc = useAppState(store);
    return isComplete(doc) ? <Today doc={doc} store={store} onClose={onClose} /> : null;
  }
  render(<Harness />);
  const day = () => {
    const doc = store.getSnapshot();
    return isComplete(doc) ? doc.currentDay : null;
  };
  return { onClose, day };
}

describe('aba Hoje (FR-035)', () => {
  it('25 de 60: anel 25/60, faltam 35, em uso, encerramento não ocorreu', () => {
    setup({ currentDay: { usedSeconds: 25 * 60, limitMin: 60 } });
    expect(screen.getByRole('img', { name: '25 de 60 minutos usados' })).toBeInTheDocument();
    expect(screen.getByText('Faltam 35 minutos')).toBeInTheDocument();
    expect(screen.getByText('Em uso')).toBeInTheDocument();
    expect(screen.getByText('Não ocorreu')).toBeInTheDocument();
    expect(screen.getByText(SUPERVISION_GUIDANCE)).toBeInTheDocument();
  });

  it('"Encerrar agora" pede confirmação explicando o bloqueio até amanhã', () => {
    const { onClose, day } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar agora' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/até amanhã/i);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(day()?.closure).toBe('nao-iniciado');
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar agora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));
    expect(day()).toMatchObject({ closure: 'em-andamento', closureRequestedByAdult: true });
    expect(onClose).toHaveBeenCalled();
  });

  it('dia encerrado: estado encerrado e "Encerrar agora" indisponível', () => {
    setup({ currentDay: { usedSeconds: 3600, closure: 'concluido' } });
    expect(screen.getByText('Encerrado')).toBeInTheDocument();
    expect(screen.getByText('Ocorreu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar agora' })).toBeDisabled();
  });
});
