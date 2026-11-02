import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';

describe('página inicial (R1, R2)', () => {
  it('a primeira renderização (pré-renderização) mostra a tela neutra "carregando"', () => {
    const html = renderToString(<Home />);
    expect(html).toContain('data-tela="carregando"');
  });

  it('sem documento, passa para a configuração', () => {
    const { container } = render(<Home />);
    expect(container.querySelector('[data-tela="configuracao"]')).not.toBeNull();
    expect(container.querySelector('[data-tela="carregando"]')).toBeNull();
  });
});
