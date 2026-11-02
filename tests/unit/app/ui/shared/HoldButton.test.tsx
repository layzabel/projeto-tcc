import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HoldButton, HOLD_MS } from '@/ui/shared/HoldButton';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      'Date',
    ],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const onComplete = vi.fn();
  render(<HoldButton onComplete={onComplete} />);
  const button = screen.getByRole('button', { name: 'Sou o adulto: segure por 3 segundos' });
  return { onComplete, button };
}

describe('HoldButton (R14, FR-030)', () => {
  it('segura por 3 000 ms → onComplete uma vez', () => {
    const { onComplete, button } = setup();
    expect(HOLD_MS).toBe(3000);
    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(2999));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.pointerUp(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerUp', 'pointerLeave', 'pointerCancel'] as const)(
    'soltar antes (%s) zera o progresso e não chama onComplete',
    (kind) => {
      const { onComplete, button } = setup();
      fireEvent.pointerDown(button);
      act(() => vi.advanceTimersByTime(1500));
      expect(Number(button.getAttribute('data-progresso'))).toBeGreaterThan(0);
      fireEvent[kind](button);
      expect(button.getAttribute('data-progresso')).toBe('0');
      act(() => vi.advanceTimersByTime(3000));
      expect(onComplete).not.toHaveBeenCalled();
      fireEvent.pointerDown(button);
      act(() => vi.advanceTimersByTime(2000));
      expect(onComplete).not.toHaveBeenCalled();
    },
  );

  it.each([' ', 'Enter'])('tecla "%s" segura por 3 s tem o mesmo efeito', (key) => {
    const { onComplete, button } = setup();
    fireEvent.keyDown(button, { key });
    fireEvent.keyDown(button, { key, repeat: true });
    act(() => vi.advanceTimersByTime(3000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('soltar a tecla antes cancela', () => {
    const { onComplete, button } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.keyUp(button, { key: 'Enter' });
    act(() => vi.advanceTimersByTime(3000));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('bloqueia contextmenu, usa touch-action none e é alvo infantil', () => {
    const { button } = setup();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(button.style.touchAction).toBe('none');
    expect(button).toHaveAttribute('data-alvo-infantil');
  });
});
