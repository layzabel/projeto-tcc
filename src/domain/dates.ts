// Datas de dia no formato YYYY-MM-DD, no fuso do aparelho (R5). A ordem lexicográfica das strings
// é a ordem cronológica.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toUtcMs(date: string): number {
  const match = DATE_RE.exec(date);
  if (!match) {
    return Number.NaN;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const ms = toUtcMs(value);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

/** Dias inteiros de a até b (positivo quando b é posterior). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

export function addDays(date: string, n: number): string {
  return new Date(toUtcMs(date) + n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** Instante ISO 8601 com o fuso do aparelho, ex.: 2026-11-01T19:02:11.123-03:00. */
export function isoLocal(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
  return `${localDate(date)}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Milissegundos até a próxima meia-noite local. */
export function msUntilMidnight(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}
