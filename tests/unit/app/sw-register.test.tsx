import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ServiceWorkerRegister from '@/app/sw-register';
import { registerServiceWorker } from '@/pwa/register';

describe('registerServiceWorker', () => {
  it('registra /sw.js com scope / quando habilitado', async () => {
    const register = vi.fn().mockResolvedValue({});
    await expect(registerServiceWorker({ register }, true)).resolves.toBe(true);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('não registra quando desabilitado', async () => {
    const register = vi.fn();
    await expect(registerServiceWorker({ register }, false)).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('não registra sem container', async () => {
    await expect(registerServiceWorker(undefined, true)).resolves.toBe(false);
  });

  it('retorna false sem lançar quando o registro falha', async () => {
    const register = vi.fn().mockRejectedValue(new Error('falhou'));
    await expect(registerServiceWorker({ register }, true)).resolves.toBe(false);
  });
});

describe('<ServiceWorkerRegister />', () => {
  it('renderiza sem lançar no jsdom', () => {
    const { container } = render(<ServiceWorkerRegister />);
    expect(container).toBeEmptyDOMElement();
  });
});
