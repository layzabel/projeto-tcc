import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CcusageError,
  ccusageArgs,
  fetchSession,
  parseSessions,
  sumDecimals,
  sumSessions,
} from '../../../scripts/metrics/ccusage.ts';
import { ccusageOutput, fakeCcusage, SESSION_OK } from '../../helpers/metrics.ts';

const fixture = (name: string) =>
  fs.readFileSync(path.resolve('tests/fixtures/ccusage', name), 'utf8');

describe('parseSessions', () => {
  it('lê a saída de --id: soma as entradas, preserva o custo e lista os modelos', () => {
    const [session] = parseSessions(SESSION_OK);
    expect(session).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      inputTokens: 10,
      outputTokens: 520,
      cacheCreationTokens: 12500,
      cacheReadTokens: 73000,
      cost: '0.30000000000000004',
      models: ['claude-opus-5-5', 'claude-sonnet-5-5'],
      lastActivity: '2026-10-31T13:56:12.001Z',
    });
  });

  it('lê a lista de sessões (period, modelsUsed, metadata.lastActivity)', () => {
    const sessions = parseSessions(fixture('sessions-list.json'));
    expect(sessions.map((s) => [s.id, s.cost, s.models.join('+')])).toEqual([
      [
        '22222222-2222-4222-8222-222222222222',
        '31.22584819999999',
        'claude-opus-5-5+claude-haiku-5-5',
      ],
      ['33333333-3333-4333-8333-333333333333', '0.1418614', 'claude-opus-5-5'],
    ]);
  });

  it.each([
    ['zero sessões', fixture('session-empty.json')],
    ['ID ausente (saída "null")', 'null'],
    ['JSON inválido', '{'],
  ])('%s → CcusageError', (_label, raw) => {
    expect(() => parseSessions(raw)).toThrow(CcusageError);
  });

  it('custo 0 com tokens > 0 (modelo sem preço) → CcusageError', () => {
    expect(() => parseSessions(ccusageOutput('x', '0'))).toThrow(/custo 0/);
  });

  it('custo 0 e tokens 0 → aceita', () => {
    const raw = JSON.stringify({
      entries: [
        {
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          model: 'claude-opus-5-5',
          timestamp: '2026-10-31T10:00:00.000Z',
        },
      ],
      sessionId: 'zero',
      totalCost: 0,
    });
    expect(parseSessions(raw)[0]?.cost).toBe('0');
  });
});

describe('sumSessions', () => {
  it('soma tokens e custo sem arredondar, une modelos e usa a última atividade', () => {
    const totals = sumSessions(parseSessions(fixture('sessions-list.json')));
    expect(totals).toMatchObject({
      ids: ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'],
      inputTokens: 12,
      outputTokens: 5500,
      cacheCreationTokens: 35000,
      cacheReadTokens: 210000,
      cost: '31.36770959999999',
      models: ['claude-opus-5-5', 'claude-haiku-5-5'],
      lastActivity: '2026-10-31T13:54:46.270Z',
    });
  });

  it('sumDecimals é exato e preserva o texto de um valor único', () => {
    expect(sumDecimals(['0.1', '0.2'])).toBe('0.3');
    expect(sumDecimals(['0.30000000000000004'])).toBe('0.30000000000000004');
    expect(sumDecimals(['1e-7', '0.0000001'])).toBe('0.0000002');
    expect(sumDecimals(['2', '0.5'])).toBe('2.5');
  });
});

describe('fetchSession', () => {
  it('monta exatamente o comando fixado do ccusage', async () => {
    const fake = fakeCcusage({ abc: ccusageOutput('abc') });
    await fetchSession('abc', fake.exec);
    expect(fake.calls).toEqual([
      ['npx', '-y', 'ccusage@20.0.46', 'session', '--json', '--offline', '--id', 'abc'],
    ]);
    expect(ccusageArgs('abc', '1.2.3')).toContain('ccusage@1.2.3');
  });

  it('falha do processo → CcusageError', async () => {
    await expect(fetchSession('abc', fakeCcusage({}, 1).exec)).rejects.toThrow(CcusageError);
  });

  it('ID que não existe → CcusageError', async () => {
    await expect(fetchSession('abc', fakeCcusage({}).exec)).rejects.toThrow(/não encontrou/);
  });
});
