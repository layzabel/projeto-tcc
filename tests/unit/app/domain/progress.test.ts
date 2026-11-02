import { describe, expect, it } from 'vitest';
import {
  firefliesLit,
  mascotMood,
  remainingMinutesLabel,
  shouldWarn,
  skyPhase,
  sunPosition,
} from '@/domain/progress';
import type { CurrentDay } from '@/domain/model';
import { makeDoc } from '../../../helpers/docs';

const day = (usedSeconds: number, extra: Partial<CurrentDay> = {}): CurrentDay =>
  makeDoc({ currentDay: { usedSeconds, limitMin: 60, ...extra } }).currentDay;

describe('skyPhase (FR-007)', () => {
  it.each([
    [0, 'dia'],
    [1199, 'dia'],
    [1200, 'tarde'],
    [2399, 'tarde'],
    [2400, 'anoitecer'],
    [3600, 'anoitecer'],
  ])('%s s usados de 60 min → %s', (used, phase) => {
    expect(skyPhase(day(used))).toBe(phase);
  });
});

describe('firefliesLit (FR-007)', () => {
  it.each([
    [0, 5],
    [719, 5],
    [720, 4],
    [1440, 3],
    [2160, 2],
    [2880, 1],
    [3600, 0],
  ])('%s s usados de 60 min → %s acesos', (used, lit) => {
    expect(firefliesLit(day(used))).toBe(lit);
  });

  it('12 min de 60 → 4 acesos', () => {
    expect(firefliesLit(day(12 * 60))).toBe(4);
  });
});

describe('sunPosition', () => {
  it('= 1 − consumido', () => {
    expect(sunPosition(day(0))).toBe(1);
    expect(sunPosition(day(1800))).toBeCloseTo(0.5);
    expect(sunPosition(day(3600))).toBe(0);
  });
});

describe('mascotMood (FR-008)', () => {
  it.each([
    [0, 'feliz'],
    [1799, 'feliz'],
    [1800, 'calmo'],
    [3299, 'calmo'],
    [3300, 'com-sono'],
    [3600, 'com-sono'],
  ])('%s s usados (aviso 5 min) → %s', (used, mood) => {
    expect(mascotMood(day(used), 5)).toBe(mood);
  });
});

describe('shouldWarn (FR-009)', () => {
  it('dispara ao chegar no aviso, uma vez, e nunca com o tempo esgotado', () => {
    expect(shouldWarn(day(3299), 5)).toBe(false);
    expect(shouldWarn(day(3300), 5)).toBe(true);
    expect(shouldWarn(day(3300, { warningPlayed: true }), 5)).toBe(false);
    expect(shouldWarn(day(3600), 5)).toBe(false);
  });

  it('reabertura já abaixo do aviso também dispara', () => {
    expect(shouldWarn(day(3480), 5)).toBe(true);
  });
});

describe('remainingMinutesLabel', () => {
  it('arredonda para cima e trata o singular', () => {
    expect(remainingMinutesLabel(day(3300))).toBe('Faltam 5 minutos');
    expect(remainingMinutesLabel(day(3301))).toBe('Faltam 5 minutos');
    expect(remainingMinutesLabel(day(3550))).toBe('Falta 1 minuto');
  });
});
