// Entidades do documento gravado no aparelho (data-model.md). Os tipos ficam no domínio para que
// a camada de armazenamento dependa dele, e não o contrário.

export type ClosureStyle = 'respiracao' | 'historinha' | 'simples';
export type ClosureState = 'nao-iniciado' | 'em-andamento' | 'concluido';

export type Consent = { acceptedAt: string; textVersion: string };

export type Profile = { nickname: string | null };

export type Settings = {
  dailyLimitMin: number;
  warningMin: number;
  closureStyle: ClosureStyle;
  sounds: boolean;
  voice: boolean;
  reducedMotion: boolean;
};

export type Credential = {
  algorithm: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  hash: string;
};

export type CurrentDay = {
  date: string;
  usedSeconds: number;
  limitMin: number;
  warningPlayed: boolean;
  supervisionInviteShown: boolean;
  closure: ClosureState;
  closureRequestedByAdult: boolean;
};

export type DailyRecord = {
  date: string;
  usedSeconds: number;
  limitMin: number;
  closureHappened: boolean;
};

export type PendingDocument = {
  schemaVersion: 1;
  consent: Consent;
  setupCompleted: false;
};

export type CompleteDocument = {
  schemaVersion: 1;
  consent: Consent;
  setupCompleted: true;
  profile: Profile;
  settings: Settings;
  credential: Credential;
  currentDay: CurrentDay;
  history: DailyRecord[];
};

export type StoredDocument = PendingDocument | CompleteDocument;

export const CLOSURE_STYLES: readonly ClosureStyle[] = ['respiracao', 'historinha', 'simples'];
export const NICKNAME_MAX = 18;
export const HISTORY_MAX_DAYS = 30;
export const PBKDF2_ITERATIONS = 210_000;

export function isComplete(doc: unknown): doc is CompleteDocument {
  return typeof doc === 'object' && doc !== null && (doc as StoredDocument).setupCompleted === true;
}
