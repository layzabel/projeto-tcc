import { describe, expect, it } from 'vitest';
import { checkScopes } from '../../../scripts/sonar/scope.ts';

const APP = ['src/app/layout.tsx', 'src/app/page.tsx', 'src/checkout/x.ts', 'src/pwa/sw.ts'];
const SCRIPTS = ['scripts/lib/exec.ts', 'scripts/about/y.ts'];

describe('checkScopes (SC-004)', () => {
  it('passa com arquivos de src/ e scripts/, sem falso positivo de substring', () => {
    expect(checkScopes(APP, SCRIPTS)).toEqual({ ok: true, offenders: [] });
  });

  it('normaliza "\\" antes da checagem', () => {
    expect(checkScopes(['src\\app\\page.tsx'], ['scripts\\lib\\exec.ts']).ok).toBe(true);
    const result = checkScopes(['src\\tests\\a.ts'], SCRIPTS);
    expect(result.ok).toBe(false);
    expect(result.offenders).toEqual(['app: src/tests/a.ts']);
  });

  it('falha com arquivo do app fora de src/', () => {
    const result = checkScopes([...APP, 'next.config.ts'], SCRIPTS);
    expect(result.ok).toBe(false);
    expect(result.offenders).toEqual(['app: next.config.ts']);
  });

  it('falha com arquivo de scripts fora de scripts/', () => {
    const result = checkScopes(APP, [...SCRIPTS, 'src/app/page.tsx']);
    expect(result.ok).toBe(false);
    expect(result.offenders).toContain('scripts: src/app/page.tsx');
  });

  it.each([
    'node_modules',
    'tests',
    '.next',
    'out',
    'coverage',
    '.scannerwork',
    'specs',
    '.specify',
    'docs',
  ])('falha quando algum segmento é %s', (segment) => {
    const file = `src/${segment}/x.ts`;
    expect(checkScopes([...APP, file], SCRIPTS).offenders).toEqual([`app: ${file}`]);
  });

  it.each(['src/app/page.test.tsx', 'src/app/page.spec.ts'])(
    'falha com arquivo de teste %s',
    (file) => {
      expect(checkScopes([...APP, file], SCRIPTS).offenders).toEqual([`app: ${file}`]);
    },
  );

  it('falha quando as listas se cruzam', () => {
    const result = checkScopes([...APP, 'scripts/lib/exec.ts'], SCRIPTS);
    expect(result.ok).toBe(false);
    expect(result.offenders).toContain('app e scripts: scripts/lib/exec.ts');
  });

  it('falha quando alguma lista está vazia', () => {
    expect(checkScopes([], SCRIPTS).ok).toBe(false);
    expect(checkScopes(APP, []).ok).toBe(false);
  });
});
