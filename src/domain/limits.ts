// Limite diário e aviso de "falta pouco" (FR-016, FR-036).

export const LIMIT_MIN = 15;
export const LIMIT_MAX = 60;
export const LIMIT_STEP = 5;
export const DEFAULT_LIMIT = 60;
export const DEFAULT_WARNING = 5;
export const WARNING_MIN = 1;
export const WARNING_MAX = 15;

export const LIMIT_OPTIONS: readonly number[] = Array.from(
  { length: (LIMIT_MAX - LIMIT_MIN) / LIMIT_STEP + 1 },
  (_, i) => LIMIT_MIN + i * LIMIT_STEP,
);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Valor válido mais próximo: múltiplo de 5 entre 15 e 60; não numérico → 60. */
export function sanitizeLimit(value: unknown): number {
  if (!isFiniteNumber(value)) {
    return DEFAULT_LIMIT;
  }
  const rounded = Math.round(value / LIMIT_STEP) * LIMIT_STEP;
  return Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, rounded));
}

/** min(max(1, valor), 15, min(limiteHoje, limiteAmanhã) − 1); não inteiro → 5 e mesma regra. */
export function sanitizeWarning(value: unknown, limitToday: number, limitTomorrow: number): number {
  const base = Number.isInteger(value) ? (value as number) : DEFAULT_WARNING;
  return Math.min(
    Math.max(WARNING_MIN, base),
    WARNING_MAX,
    Math.min(limitToday, limitTomorrow) - 1,
  );
}

export function isValidLimit(value: number): boolean {
  return LIMIT_OPTIONS.includes(value);
}
