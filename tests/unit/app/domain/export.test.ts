import { describe, expect, it } from 'vitest';
import { exportFileName, serializeExport, toExport } from '@/domain/export';
import { HASH, makeDoc, SALT } from '../../../helpers/docs';

describe('exportação (FR-041, FR-043, SC-010)', () => {
  const doc = makeDoc({
    settings: { dailyLimitMin: 45 },
    currentDay: { date: '2026-11-01', usedSeconds: 1500, supervisionInviteShown: true },
  });
  const now = new Date(2026, 10, 1, 20, 15, 0, 0);

  it('projeta o documento no formato do contrato', () => {
    const exported = toExport(doc, now);
    expect(exported).toEqual({
      formato: 'controle-parental-exportacao',
      versaoFormato: 1,
      exportadoEm: expect.stringMatching(/^2026-11-01T20:15:00\.000[+-]\d{2}:\d{2}$/),
      consentimento: { aceitoEm: '2026-11-01T19:02:11.123-03:00', versaoTexto: '1.0' },
      crianca: { apelido: 'Lia' },
      ajustes: {
        limiteDiarioMinutos: 45,
        avisoMinutos: 5,
        estiloEncerramento: 'respiracao',
        sons: true,
        voz: true,
        menosAnimacao: false,
      },
      diaAtual: {
        data: '2026-11-01',
        segundosUsados: 1500,
        limiteMinutos: 60,
        avisoTocou: false,
        conviteSupervisaoFeito: true,
        encerramento: 'nao-iniciado',
        encerramentoPedidoPeloResponsavel: false,
      },
      historico: [
        {
          data: '2026-10-30',
          segundosUsados: 3600,
          limiteMinutos: 60,
          encerramentoAconteceu: true,
        },
      ],
    });
  });

  it('apelido ausente → null', () => {
    expect(toExport(makeDoc({ profile: { nickname: null } }), now).crianca.apelido).toBeNull();
  });

  it('a serialização tem 2 espaços e não contém a credencial', () => {
    const text = serializeExport(toExport(doc, now));
    expect(text).toContain('\n  "formato"');
    expect(text).not.toContain('credential');
    expect(text).not.toContain(SALT);
    expect(text).not.toContain(HASH);
    expect(text).not.toContain('PBKDF2');
  });

  it('nome do arquivo com a data local', () => {
    expect(exportFileName('2026-11-01')).toBe('controle-parental-dados-2026-11-01.json');
  });
});
