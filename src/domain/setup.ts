// Configuração inicial: consentimento gravado sozinho e documento completo na conclusão (US1).

import { isoLocal } from './dates';
import { createDay } from './day';
import { DEFAULT_WARNING, sanitizeLimit } from './limits';
import {
  NICKNAME_MAX,
  type CompleteDocument,
  type Credential,
  type PendingDocument,
  type Settings,
} from './model';

export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().slice(0, NICKNAME_MAX).trim();
  return trimmed === '' ? null : trimmed;
}

export function acceptConsent(now: Date, textVersion: string): PendingDocument {
  return {
    schemaVersion: 1,
    consent: { acceptedAt: isoLocal(now), textVersion },
    setupCompleted: false,
  };
}

export type SetupValues = {
  nickname: string;
  dailyLimitMin: number;
  credential: Credential;
};

export function defaultSettings(dailyLimitMin: number): Settings {
  return {
    dailyLimitMin: sanitizeLimit(dailyLimitMin),
    warningMin: DEFAULT_WARNING,
    closureStyle: 'respiracao',
    sounds: true,
    voice: true,
    reducedMotion: false,
  };
}

export function completeSetup(
  doc: PendingDocument,
  values: SetupValues,
  today: string,
): CompleteDocument {
  const settings = defaultSettings(values.dailyLimitMin);
  return {
    schemaVersion: 1,
    consent: doc.consent,
    setupCompleted: true,
    profile: { nickname: normalizeNickname(values.nickname) },
    settings,
    credential: values.credential,
    currentDay: createDay(today, settings),
    history: [],
  };
}
