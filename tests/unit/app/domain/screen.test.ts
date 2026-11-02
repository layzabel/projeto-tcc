import { describe, expect, it } from 'vitest';
import { deriveScreen, LOADING, type ChildScreen } from '@/domain/screen';
import { makeDoc } from '../../../helpers/docs';

const session = (childScreen: ChildScreen = 'mundo') => ({ childScreen });

describe('deriveScreen (contracts/screens.md §1)', () => {
  it('1. não carregado → carregando', () => {
    expect(deriveScreen(LOADING, session())).toBe('carregando');
  });

  it('2. sem documento ou setupCompleted = false → configuracao', () => {
    expect(deriveScreen(null, session())).toBe('configuracao');
    expect(
      deriveScreen(
        {
          schemaVersion: 1,
          consent: { acceptedAt: '2026-11-01T10:00:00Z', textVersion: '1.0' },
          setupCompleted: false,
        },
        session('jogo'),
      ),
    ).toBe('configuracao');
  });

  it('3. closure concluido → bloqueio', () => {
    const doc = makeDoc({ currentDay: { closure: 'concluido', usedSeconds: 3600 } });
    expect(deriveScreen(doc, session('jogo'))).toBe('bloqueio');
  });

  it('4. em-andamento ou esgotado → encerramento', () => {
    expect(deriveScreen(makeDoc({ currentDay: { closure: 'em-andamento' } }), session())).toBe(
      'encerramento',
    );
    expect(deriveScreen(makeDoc({ currentDay: { usedSeconds: 3600 } }), session())).toBe(
      'encerramento',
    );
  });

  it.each(['jogo', 'historia'] as const)('tempo esgotado em %s → encerramento', (child) => {
    expect(deriveScreen(makeDoc({ currentDay: { usedSeconds: 3600 } }), session(child))).toBe(
      'encerramento',
    );
  });

  it.each(['mundo', 'jogo', 'historia'] as const)('5. caso contrário → %s', (child) => {
    expect(deriveScreen(makeDoc(), session(child))).toBe(child);
  });
});
