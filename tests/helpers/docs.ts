import type {
  CompleteDocument,
  CurrentDay,
  DailyRecord,
  Profile,
  Settings,
} from '../../src/domain/model';

export const SALT = 'q8m4w0n2b1Lx7a9cZ3e5Rg==';
export const HASH = '3m5n8X0bYpQh1sWvN2c4dE6fG7hJ9kL0mN1oP2qR3sU=';

export type DocOverrides = {
  profile?: Partial<Profile>;
  settings?: Partial<Settings>;
  currentDay?: Partial<CurrentDay>;
  history?: DailyRecord[];
};

/** Documento completo e válido (contracts/storage-schema.md › Exemplo). */
export function makeDoc(overrides: DocOverrides = {}): CompleteDocument {
  return {
    schemaVersion: 1,
    consent: { acceptedAt: '2026-11-01T19:02:11.123-03:00', textVersion: '1.0' },
    setupCompleted: true,
    profile: { nickname: 'Lia', ...overrides.profile },
    settings: {
      dailyLimitMin: 45,
      warningMin: 5,
      closureStyle: 'respiracao',
      sounds: true,
      voice: true,
      reducedMotion: false,
      ...overrides.settings,
    },
    credential: { algorithm: 'PBKDF2-SHA-256', iterations: 210000, salt: SALT, hash: HASH },
    currentDay: {
      date: '2026-11-01',
      usedSeconds: 1500,
      limitMin: 60,
      warningPlayed: false,
      supervisionInviteShown: true,
      closure: 'nao-iniciado',
      closureRequestedByAdult: false,
      ...overrides.currentDay,
    },
    history: overrides.history ?? [
      { date: '2026-10-30', usedSeconds: 3600, limitMin: 60, closureHappened: true },
    ],
  };
}

/** Clona em objeto JSON genérico, para adulterar campos nos testes. */
export function raw(doc: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
}

/** Storage em memória com a mesma interface do localStorage. */
export class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  failWith: Error | null = null;
  setCalls = 0;

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.failWith) {
      throw this.failWith;
    }
    this.data.set(key, value);
  }
}
