import { describe, expect, it } from 'vitest';
import { acceptConsent, completeSetup, normalizeNickname } from '@/domain/setup';
import type { Credential } from '@/domain/model';
import { HASH, SALT } from '../../../helpers/docs';

const credential: Credential = {
  algorithm: 'PBKDF2-SHA-256',
  iterations: 210000,
  salt: SALT,
  hash: HASH,
};

describe('acceptConsent (FR-003, SC-001)', () => {
  it('grava só schemaVersion, consent e setupCompleted = false', () => {
    const now = new Date(2026, 10, 1, 19, 2, 11, 123);
    const doc = acceptConsent(now, '1.0');
    expect(Object.keys(doc).sort()).toEqual(['consent', 'schemaVersion', 'setupCompleted']);
    expect(doc.schemaVersion).toBe(1);
    expect(doc.setupCompleted).toBe(false);
    expect(doc.consent.textVersion).toBe('1.0');
    expect(new Date(doc.consent.acceptedAt).getTime()).toBe(now.getTime());
    expect(doc.consent.acceptedAt).toMatch(/^2026-11-01T19:02:11\.123[+-]\d{2}:\d{2}$/);
  });
});

describe('completeSetup', () => {
  const pending = acceptConsent(new Date(2026, 10, 1, 19), '1.0');

  it('monta o documento completo com ajustes padrão e o dia atual', () => {
    const doc = completeSetup(
      pending,
      { nickname: '  Lia  ', dailyLimitMin: 45, credential },
      '2026-11-01',
    );
    expect(doc).toEqual({
      schemaVersion: 1,
      consent: pending.consent,
      setupCompleted: true,
      profile: { nickname: 'Lia' },
      settings: {
        dailyLimitMin: 45,
        warningMin: 5,
        closureStyle: 'respiracao',
        sounds: true,
        voice: true,
        reducedMotion: false,
      },
      credential,
      currentDay: {
        date: '2026-11-01',
        usedSeconds: 0,
        limitMin: 45,
        warningPlayed: false,
        supervisionInviteShown: false,
        closure: 'nao-iniciado',
        closureRequestedByAdult: false,
      },
      history: [],
    });
  });

  it('apelido vazio → null; limite inválido é saneado', () => {
    const doc = completeSetup(
      pending,
      { nickname: '   ', dailyLimitMin: 90, credential },
      '2026-11-01',
    );
    expect(doc.profile.nickname).toBeNull();
    expect(doc.settings.dailyLimitMin).toBe(60);
    expect(doc.currentDay.limitMin).toBe(60);
  });
});

describe('normalizeNickname', () => {
  it('apara, limita a 18 e transforma vazio em null', () => {
    expect(normalizeNickname(' Bia ')).toBe('Bia');
    expect(normalizeNickname('')).toBeNull();
    expect(normalizeNickname(null)).toBeNull();
    expect(normalizeNickname('a'.repeat(25))).toBe('a'.repeat(18));
  });
});
