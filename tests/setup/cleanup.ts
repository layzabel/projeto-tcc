import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem "globals" no Vitest, a Testing Library não desmonta sozinha entre os testes.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
