import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BigButton } from '@/ui/shared/BigButton';
import { Mascot, type Mood } from '@/ui/shared/Mascot';
import { SpeechBubble } from '@/ui/shared/SpeechBubble';

describe('Mascot', () => {
  it.each(['feliz', 'calmo', 'com-sono', 'dormindo', 'festejando'] as Mood[])(
    'expõe data-humor="%s" e nome acessível',
    (mood) => {
      render(<Mascot mood={mood} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('data-humor', mood);
      expect(img.getAttribute('aria-label')).toMatch(/^Vaga-lume/);
    },
  );
});

describe('SpeechBubble', () => {
  it('é uma região aria-live polite com o texto', () => {
    render(<SpeechBubble text="Oi!" />);
    const bubble = screen.getByRole('status');
    expect(bubble).toHaveAttribute('aria-live', 'polite');
    expect(bubble).toHaveTextContent('Oi!');
  });
});

describe('BigButton', () => {
  it('é alvo infantil com nome acessível e chama onClick', () => {
    const onClick = vi.fn();
    render(
      <BigButton label="Brincar" onClick={onClick}>
        <svg />
      </BigButton>,
    );
    const button = screen.getByRole('button', { name: 'Brincar' });
    expect(button).toHaveAttribute('data-alvo-infantil');
    expect(button).toHaveClass('botao-grande');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
