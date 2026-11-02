import { describe, expect, it } from 'vitest';
import { closureSteps, finishClosure, startClosure, STEP_DURATION_MS } from '@/domain/closure';
import { makeDoc } from '../../../helpers/docs';

describe('closureSteps (FR-027)', () => {
  it('respiração', () => {
    expect(closureSteps('respiracao')).toEqual([
      'aviso',
      'respiracao',
      'respiracao',
      'respiracao',
      'elogio',
      'escolha',
      'despedida',
    ]);
  });

  it('historinha', () => {
    expect(closureSteps('historinha')).toEqual([
      'aviso',
      'historia',
      'elogio',
      'escolha',
      'despedida',
    ]);
  });

  it('simples', () => {
    expect(closureSteps('simples')).toEqual(['aviso', 'elogio', 'escolha', 'despedida']);
  });

  it('etapas com interação não avançam por tempo', () => {
    expect(STEP_DURATION_MS.escolha).toBeNull();
    expect(STEP_DURATION_MS.historia).toBeNull();
    for (const step of ['aviso', 'respiracao', 'elogio', 'despedida'] as const) {
      expect(STEP_DURATION_MS[step]).toBeGreaterThan(0);
    }
  });
});

describe('startClosure e finishClosure', () => {
  it('startClosure grava em-andamento', () => {
    expect(startClosure(makeDoc()).currentDay.closure).toBe('em-andamento');
  });

  it('finishClosure grava concluido', () => {
    const doc = makeDoc({ currentDay: { closure: 'em-andamento' } });
    expect(finishClosure(doc).currentDay.closure).toBe('concluido');
  });

  it('nenhuma função volta a nao-iniciado no mesmo dia (FR-015)', () => {
    const done = makeDoc({ currentDay: { closure: 'concluido' } });
    expect(startClosure(done).currentDay.closure).toBe('concluido');
    expect(finishClosure(done).currentDay.closure).toBe('concluido');
    const running = makeDoc({ currentDay: { closure: 'em-andamento' } });
    expect(startClosure(running)).toBe(running);
  });
});
