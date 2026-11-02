import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { STORY_PAGES } from '@/content/story';
import { Story } from '@/ui/child/Story';
import { makeDoc } from '../../../../helpers/docs';
import { fakeServices } from '../../../../helpers/services';

function setup(voice = true) {
  const { services, wrapper } = fakeServices();
  const onFinish = vi.fn();
  const { settings } = makeDoc({ settings: { voice } });
  render(<Story settings={settings} onFinish={onFinish} />, { wrapper });
  return { services, onFinish };
}

const pageButton = () => screen.getByRole('button', { name: /Tocar na história|Próxima página/ });

describe('Story (US8, FR-024, FR-025)', () => {
  it('tem 6 páginas com cenário, frase e efeito próprios', () => {
    expect(STORY_PAGES).toHaveLength(6);
    expect(STORY_PAGES.map((p) => p.efeito)).toEqual([
      'risada',
      'luz-enfraquecendo',
      'bocejo',
      'respiracao',
      'flores',
      'dormir',
    ]);
  });

  it('cada página mostra o cenário, a frase falada e a dica de toque', () => {
    const { services } = setup();
    const page = STORY_PAGES[0]!;
    expect(document.querySelector('[data-ceu]')).toHaveAttribute('data-ceu', page.cenario);
    expect(screen.getByRole('status')).toHaveTextContent(page.frase);
    expect(services.speech.speak).toHaveBeenCalledWith(page.frase, {
      voice: true,
      signal: expect.anything(),
    });
    expect(document.querySelector('.dica-toque')).not.toBeNull();
    expect(pageButton()).toHaveAttribute('data-alvo-infantil');
  });

  it('o primeiro toque dispara o efeito e o segundo avança', () => {
    const { services } = setup();
    fireEvent.click(pageButton());
    expect(document.querySelector('[data-efeito]')).toHaveAttribute('data-efeito', 'risada');
    expect(services.sound.play).toHaveBeenCalledWith('risada', expect.anything());
    fireEvent.click(pageButton());
    expect(screen.getByRole('status')).toHaveTextContent(STORY_PAGES[1]!.frase);
    expect(document.querySelector('[data-efeito]')).toBeNull();
  });

  it('ao fim chama onFinish', () => {
    const { onFinish } = setup();
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(pageButton());
      expect(onFinish).not.toHaveBeenCalled();
      fireEvent.click(pageButton());
    }
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('voz desligada: a frase aparece só no balão', () => {
    const { services } = setup(false);
    expect(screen.getByRole('status')).toHaveTextContent(STORY_PAGES[0]!.frase);
    expect(services.speech.speak).toHaveBeenCalledWith(
      STORY_PAGES[0]!.frase,
      expect.objectContaining({ voice: false }),
    );
  });
});
