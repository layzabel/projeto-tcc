import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHRASES } from '@/content/phrases';
import { Blocked } from '@/ui/child/Blocked';
import { makeDoc } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['Date', 'setInterval', 'clearInterval'],
    now: new Date(2026, 10, 1, 21, 30),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Blocked (FR-029)', () => {
  it('céu noturno, mascote dormindo, mensagem e só o botão do adulto', () => {
    const { wrapper } = fakeServices({ clock: { monotonic: () => 0, now: () => new Date() } });
    const doc = makeDoc({ currentDay: { closure: 'concluido', usedSeconds: 3600 } });
    render(<Blocked doc={doc} onAdult={vi.fn()} />, { wrapper });
    expect(document.querySelector('[data-tela="bloqueio"]')).not.toBeNull();
    expect(document.querySelector('[data-ceu]')).toHaveAttribute('data-ceu', 'noite');
    expect(screen.getByRole('img', { name: /Vaga-lume/ })).toHaveAttribute(
      'data-humor',
      'dormindo',
    );
    expect(screen.getByRole('status')).toHaveTextContent(PHRASES.blocked);
    expect(screen.getByText('Faltam 2 h 30 min para a meia-noite')).toBeInTheDocument();
    const targets = document.querySelectorAll('[data-alvo-infantil]');
    expect(targets).toHaveLength(1);
    expect(targets[0]).toHaveAccessibleName('Sou o adulto: segure por 3 segundos');
  });
});
