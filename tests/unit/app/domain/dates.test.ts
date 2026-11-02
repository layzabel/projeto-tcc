import { describe, expect, it } from 'vitest';
import { addDays, compareDates, daysBetween, localDate } from '@/domain/dates';

describe('localDate (R5)', () => {
  it('usa os componentes locais da data', () => {
    expect(localDate(new Date(2026, 10, 1, 12, 0, 0))).toBe('2026-11-01');
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('perto da meia-noite continua no dia local', () => {
    expect(localDate(new Date(2026, 10, 1, 23, 59, 59, 999))).toBe('2026-11-01');
    expect(localDate(new Date(2026, 10, 2, 0, 0, 0, 0))).toBe('2026-11-02');
  });
});

describe('daysBetween', () => {
  it('conta dias inteiros entre datas', () => {
    expect(daysBetween('2026-11-01', '2026-11-01')).toBe(0);
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
    expect(daysBetween('2026-11-02', '2026-11-01')).toBe(-1);
    expect(daysBetween('2026-10-01', '2026-11-01')).toBe(31);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  it('não sofre com mudança de horário de verão', () => {
    expect(daysBetween('2018-11-03', '2018-11-05')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });
});

describe('addDays', () => {
  it('soma e subtrai dias atravessando meses e anos', () => {
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', -29)).toBe('2026-10-03');
  });
});

describe('compareDates', () => {
  it('compara por string ISO', () => {
    expect(compareDates('2026-11-01', '2026-11-02')).toBeLessThan(0);
    expect(compareDates('2026-11-02', '2026-11-01')).toBeGreaterThan(0);
    expect(compareDates('2026-11-01', '2026-11-01')).toBe(0);
  });
});
