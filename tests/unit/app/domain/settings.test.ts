import { describe, expect, it } from 'vitest';
import {
  applySettings,
  dayStatus,
  requestCloseNow,
  validateNewLimit,
  validateWarning,
} from '@/domain/settings';
import { makeDoc } from '../../../helpers/docs';

describe('validateNewLimit (FR-036, Edge Cases)', () => {
  it('aceita só 15..60 de 5 em 5', () => {
    const doc = makeDoc({ settings: { warningMin: 5 } });
    expect(validateNewLimit(doc, 30)).toEqual({ ok: true });
    expect(validateNewLimit(doc, 32).ok).toBe(false);
    expect(validateNewLimit(doc, 10).ok).toBe(false);
    expect(validateNewLimit(doc, 65).ok).toBe(false);
  });

  it('recusa quando o aviso é ≥ novo limite', () => {
    const doc = makeDoc({ settings: { warningMin: 15, dailyLimitMin: 60 } });
    expect(validateNewLimit(doc, 15)).toEqual({
      ok: false,
      message: 'Reduza o aviso antes de escolher este limite',
    });
    expect(validateNewLimit(doc, 20)).toEqual({ ok: true });
  });
});

describe('validateWarning', () => {
  it('aceita inteiros 1..15 menores que os dois limites', () => {
    const doc = makeDoc({ settings: { dailyLimitMin: 20 }, currentDay: { limitMin: 60 } });
    expect(validateWarning(doc, 1).ok).toBe(true);
    expect(validateWarning(doc, 15).ok).toBe(true);
    expect(validateWarning(doc, 0).ok).toBe(false);
    expect(validateWarning(doc, 16).ok).toBe(false);
    expect(validateWarning(doc, 2.5).ok).toBe(false);
  });

  it('precisa ser menor que o limite de hoje e o de amanhã', () => {
    const today15 = makeDoc({ settings: { dailyLimitMin: 60 }, currentDay: { limitMin: 15 } });
    expect(validateWarning(today15, 15).ok).toBe(false);
    expect(validateWarning(today15, 14).ok).toBe(true);
    const tomorrow15 = makeDoc({ settings: { dailyLimitMin: 15 }, currentDay: { limitMin: 60 } });
    expect(validateWarning(tomorrow15, 15).ok).toBe(false);
  });
});

describe('applySettings (FR-017)', () => {
  it('alterar dailyLimitMin não muda o limite de hoje', () => {
    const doc = makeDoc({ settings: { dailyLimitMin: 60 }, currentDay: { limitMin: 60 } });
    const next = applySettings(doc, { dailyLimitMin: 30 });
    expect(next.settings.dailyLimitMin).toBe(30);
    expect(next.currentDay.limitMin).toBe(60);
  });

  it('altera os outros ajustes', () => {
    const next = applySettings(makeDoc(), {
      closureStyle: 'simples',
      sounds: false,
      voice: false,
      reducedMotion: true,
      warningMin: 3,
    });
    expect(next.settings).toMatchObject({
      closureStyle: 'simples',
      sounds: false,
      voice: false,
      reducedMotion: true,
      warningMin: 3,
    });
  });
});

describe('requestCloseNow (FR-026, FR-035)', () => {
  it('grava em-andamento e closureRequestedByAdult', () => {
    const next = requestCloseNow(makeDoc());
    expect(next.currentDay.closure).toBe('em-andamento');
    expect(next.currentDay.closureRequestedByAdult).toBe(true);
  });

  it('é recusado em dia concluído', () => {
    const done = makeDoc({ currentDay: { closure: 'concluido' } });
    expect(requestCloseNow(done)).toBe(done);
  });
});

describe('dayStatus', () => {
  it('encerrado só com concluido', () => {
    expect(dayStatus(makeDoc().currentDay)).toBe('em uso');
    expect(dayStatus(makeDoc({ currentDay: { closure: 'em-andamento' } }).currentDay)).toBe(
      'em uso',
    );
    expect(dayStatus(makeDoc({ currentDay: { closure: 'concluido' } }).currentDay)).toBe(
      'encerrado',
    );
  });
});
