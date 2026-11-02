import { describe, expect, it } from 'vitest';
import { parseDocument, sanitize } from '@/storage/schema';
import { makeDoc, raw } from '../../../helpers/docs';

function sane(input: unknown) {
  const { doc } = sanitize(input);
  if (doc === null || !doc.setupCompleted) {
    throw new Error('esperado documento completo');
  }
  return doc;
}

describe('sanitize — documento ausente (contracts/storage-schema.md)', () => {
  it('documento válido passa sem alteração', () => {
    const doc = makeDoc();
    expect(sanitize(raw(doc))).toEqual({ doc, changed: false });
  });

  it.each([
    ['null', null],
    ['texto', 'abc'],
    ['array', []],
    ['schemaVersion 2', { ...raw(makeDoc()), schemaVersion: 2 }],
    ['sem schemaVersion', { ...raw(makeDoc()), schemaVersion: undefined }],
    ['sem consent', { ...raw(makeDoc()), consent: undefined }],
    ['consent sem data', { ...raw(makeDoc()), consent: { textVersion: '1.0' } }],
    [
      'consent com data inválida',
      { ...raw(makeDoc()), consent: { acceptedAt: 'ontem', textVersion: '1.0' } },
    ],
    ['consent sem versão', { ...raw(makeDoc()), consent: { acceptedAt: '2026-11-01T10:00:00Z' } }],
    ['setupCompleted não booleano', { ...raw(makeDoc()), setupCompleted: 'sim' }],
    ['sem credential', { ...raw(makeDoc()), credential: undefined }],
    [
      'credential com outro algoritmo',
      { ...raw(makeDoc()), credential: { ...makeDoc().credential, algorithm: 'MD5' } },
    ],
    [
      'credential com iterações diferentes',
      { ...raw(makeDoc()), credential: { ...makeDoc().credential, iterations: 1 } },
    ],
    [
      'credential com sal curto',
      { ...raw(makeDoc()), credential: { ...makeDoc().credential, salt: 'abc' } },
    ],
    [
      'credential com hash curto',
      { ...raw(makeDoc()), credential: { ...makeDoc().credential, hash: 'abc=' } },
    ],
    ['sem currentDay', { ...raw(makeDoc()), currentDay: undefined }],
    [
      'currentDay com data inválida',
      { ...raw(makeDoc()), currentDay: { ...makeDoc().currentDay, date: '01/11/2026' } },
    ],
    [
      'currentDay com data impossível',
      { ...raw(makeDoc()), currentDay: { ...makeDoc().currentDay, date: '2026-02-30' } },
    ],
    ['sem settings', { ...raw(makeDoc()), settings: undefined }],
  ])('%s → sem documento', (_, input) => {
    expect(sanitize(input).doc).toBeNull();
  });
});

describe('parseDocument', () => {
  it('JSON inválido ou ausente → sem documento', () => {
    expect(parseDocument(null).doc).toBeNull();
    expect(parseDocument('{').doc).toBeNull();
    expect(parseDocument('').doc).toBeNull();
  });

  it('JSON válido é saneado', () => {
    expect(parseDocument(JSON.stringify(makeDoc())).doc).toEqual(makeDoc());
  });
});

describe('sanitize — documento incompleto', () => {
  it('setupCompleted = false mantém só schemaVersion, consent e setupCompleted', () => {
    const pending = {
      schemaVersion: 1,
      consent: { acceptedAt: '2026-11-01T19:02:11.123-03:00', textVersion: '1.0' },
      setupCompleted: false,
      profile: { nickname: 'x' },
    };
    expect(sanitize(pending)).toEqual({
      doc: { schemaVersion: 1, consent: pending.consent, setupCompleted: false },
      changed: true,
    });
  });
});

describe('sanitize — limites (FR-016, SC-005)', () => {
  it.each([
    [0, 15],
    [17, 15],
    [61, 60],
    [999, 60],
    ['abc', 60],
  ])('dailyLimitMin e currentDay.limitMin %s → %s', (input, expected) => {
    const r = raw(makeDoc());
    (r.settings as Record<string, unknown>).dailyLimitMin = input;
    (r.currentDay as Record<string, unknown>).limitMin = input;
    const doc = sane(r);
    expect(doc.settings.dailyLimitMin).toBe(expected);
    expect(doc.currentDay.limitMin).toBe(expected);
    expect(sanitize(r).changed).toBe(true);
  });

  it('warningMin inválido é saneado e fica menor que os dois limites', () => {
    const r = raw(makeDoc({ settings: { dailyLimitMin: 15 } }));
    (r.settings as Record<string, unknown>).warningMin = 30;
    expect(sane(r).settings.warningMin).toBe(14);
    (r.settings as Record<string, unknown>).warningMin = 'x';
    expect(sane(r).settings.warningMin).toBe(5);
  });
});

describe('sanitize — dia atual', () => {
  it.each([
    [-10, 0],
    [12.9, 12],
    [99999, 3600],
    ['x', 0],
  ])('usedSeconds %s → %s', (input, expected) => {
    const r = raw(makeDoc());
    (r.currentDay as Record<string, unknown>).usedSeconds = input;
    expect(sane(r).currentDay.usedSeconds).toBe(expected);
  });

  it('closure desconhecido → nao-iniciado sem tempo esgotado', () => {
    const r = raw(makeDoc());
    (r.currentDay as Record<string, unknown>).closure = 'xyz';
    expect(sane(r).currentDay.closure).toBe('nao-iniciado');
  });

  it('closure desconhecido → em-andamento com tempo esgotado', () => {
    const r = raw(makeDoc({ currentDay: { usedSeconds: 3600 } }));
    (r.currentDay as Record<string, unknown>).closure = 'xyz';
    expect(sane(r).currentDay.closure).toBe('em-andamento');
  });

  it('booleans não booleanos → padrão', () => {
    const r = raw(makeDoc({ currentDay: { warningPlayed: true } }));
    const day = r.currentDay as Record<string, unknown>;
    day.warningPlayed = 'sim';
    day.supervisionInviteShown = 1;
    day.closureRequestedByAdult = null;
    const settings = r.settings as Record<string, unknown>;
    settings.sounds = 'nao';
    settings.voice = 0;
    settings.reducedMotion = 'x';
    const doc = sane(r);
    expect(doc.currentDay.warningPlayed).toBe(false);
    expect(doc.currentDay.supervisionInviteShown).toBe(false);
    expect(doc.currentDay.closureRequestedByAdult).toBe(false);
    expect(doc.settings.sounds).toBe(true);
    expect(doc.settings.voice).toBe(true);
    expect(doc.settings.reducedMotion).toBe(false);
  });
});

describe('sanitize — ajustes e perfil', () => {
  it('closureStyle desconhecido → respiracao', () => {
    const r = raw(makeDoc({ settings: { closureStyle: 'simples' } }));
    expect(sane(r).settings.closureStyle).toBe('simples');
    (r.settings as Record<string, unknown>).closureStyle = 'festa';
    expect(sane(r).settings.closureStyle).toBe('respiracao');
  });

  it('nickname não string → null; maior que 18 → truncado; vazio → null', () => {
    const r = raw(makeDoc());
    (r.profile as Record<string, unknown>).nickname = 42;
    expect(sane(r).profile.nickname).toBeNull();
    (r.profile as Record<string, unknown>).nickname = 'abcdefghijklmnopqrstuvwxyz';
    expect(sane(r).profile.nickname).toBe('abcdefghijklmnopqr');
    (r.profile as Record<string, unknown>).nickname = '   ';
    expect(sane(r).profile.nickname).toBeNull();
    r.profile = undefined;
    expect(sane(r).profile.nickname).toBeNull();
  });
});

describe('sanitize — histórico', () => {
  it('descarta registros inválidos, duplicados ou com data ≥ dia atual, e ordena', () => {
    const r = raw(makeDoc());
    r.history = [
      { date: '2026-10-29', usedSeconds: 60, limitMin: 60, closureHappened: false },
      { date: '2026-10-28', usedSeconds: 120, limitMin: 61, closureHappened: true },
      { date: '2026-10-29', usedSeconds: 999, limitMin: 60, closureHappened: false },
      { date: '2026-11-01', usedSeconds: 60, limitMin: 60, closureHappened: false },
      { date: '2026-11-05', usedSeconds: 60, limitMin: 60, closureHappened: false },
      { date: 'ontem', usedSeconds: 60, limitMin: 60, closureHappened: false },
      { date: '2026-10-27', usedSeconds: 'x', limitMin: 60, closureHappened: false },
      'lixo',
    ];
    expect(sane(r).history).toEqual([
      { date: '2026-10-28', usedSeconds: 120, limitMin: 60, closureHappened: true },
      { date: '2026-10-29', usedSeconds: 60, limitMin: 60, closureHappened: false },
    ]);
  });

  it('histórico ausente → vazio', () => {
    const r = raw(makeDoc());
    r.history = undefined;
    expect(sane(r).history).toEqual([]);
  });
});

describe('sanitize — campos desconhecidos', () => {
  it('são descartados e marcam alteração', () => {
    const r = raw(makeDoc());
    r.extra = 'x';
    (r.settings as Record<string, unknown>).tema = 'escuro';
    (r.currentDay as Record<string, unknown>).bonus = 10;
    const result = sanitize(r);
    expect(result.doc).toEqual(makeDoc());
    expect(result.changed).toBe(true);
  });
});
