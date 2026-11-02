import type { Page } from '@playwright/test';
import fs from 'node:fs';
import {
  alerta,
  CREDENCIAL,
  DATA_BASE,
  diaRelativo,
  digitarSenha,
  documentoValido,
  expect,
  lerDia,
  lerDocumento,
  SENHA,
  segurarBotaoAdulto,
  test,
} from './fixtures';

const SBP = /Sociedade Brasileira de Pediatria/;

async function abrirPainel(page: Page) {
  await segurarBotaoAdulto(page);
  await digitarSenha(page, SENHA);
  await expect(page.getByRole('tablist')).toBeVisible();
}

async function aba(page: Page, nome: 'Hoje' | 'Ajustes' | 'Registro') {
  await page.getByRole('tab', { name: nome }).click();
}

test.describe('painel: Hoje e Ajustes (US5)', () => {
  test('aba Hoje mostra os valores do dia e a SBP em todas as abas (US5 1, 10)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 25 * 60 } }));
    await page.goto('/');
    await abrirPainel(page);
    await expect(page.getByRole('img', { name: '25 de 60 minutos usados' })).toBeVisible();
    await expect(page.getByText('Faltam 35 minutos')).toBeVisible();
    await expect(page.getByText('Em uso')).toBeVisible();
    await expect(page.getByText('Não ocorreu')).toBeVisible();
    await expect(page.getByText(/adulto por perto/i).first()).toBeVisible();
    for (const nome of ['Hoje', 'Ajustes', 'Registro'] as const) {
      await aba(page, nome);
      await expect(page.getByText(SBP)).toBeVisible();
    }
  });

  test('"Encerrar agora": cancelar não muda nada; confirmar fecha e começa o encerramento (US5 2–3)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await abrirPainel(page);
    await page.getByRole('button', { name: 'Encerrar agora' }).click();
    await expect(page.getByRole('alertdialog')).toContainText(/até amanhã/i);
    await page.getByRole('button', { name: 'Cancelar' }).click();
    expect((await lerDia(page)).closure).toBe('nao-iniciado');
    await page.getByRole('button', { name: 'Encerrar agora' }).click();
    await page.getByRole('button', { name: 'Confirmar encerramento' }).click();
    await expect(page.locator('[data-tela="encerramento"]')).toBeVisible();
    expect(await lerDia(page)).toMatchObject({
      closure: 'em-andamento',
      closureRequestedByAdult: true,
    });
    await page.reload();
    await expect(page.locator('[data-tela="encerramento"]')).toHaveAttribute('data-etapa', 'aviso');
  });

  test('dia encerrado: "Encerrar agora" indisponível (US5 3)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({ currentDay: { usedSeconds: 3600, closure: 'concluido' } }),
    );
    await page.goto('/');
    await abrirPainel(page);
    await expect(page.getByText('Encerrado', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Encerrar agora' })).toBeDisabled();
  });

  test('aviso fora da faixa é recusado (US5 4)', async ({ page, relogio, comDocumento }) => {
    await relogio();
    await comDocumento(documentoValido({ settings: { dailyLimitMin: 15 } }));
    await page.goto('/');
    await abrirPainel(page);
    await aba(page, 'Ajustes');
    await page.getByLabel('Aviso antes de acabar').selectOption('15');
    await expect(alerta(page)).toBeVisible();
    expect(((await lerDocumento(page))?.settings as { warningMin: number }).warningMin).toBe(5);
  });

  test('sons desligados: jogo sem som de acerto, mas falta-pouco e fim-de-tempo tocam (US5 5)', async ({
    page,
    relogio,
    comDocumento,
    sons,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({
        settings: { sounds: false, closureStyle: 'simples' },
        currentDay: { usedSeconds: 3600 - 5 * 60 - 20 },
      }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Brincar' }).click();
    await expect(page.locator('[data-tela="jogo"]')).toBeVisible();
    for (const cor of ['azul', 'vermelho'] as const) {
      await page.locator(`[data-brinquedo][data-cor="${cor}"]`).first().click();
      await page
        .getByRole('button', { name: cor === 'azul' ? 'Caixa azul' : 'Caixa vermelha' })
        .click();
    }
    await page.clock.runFor(30_000);
    await page.clock.runFor(5 * 60_000);
    await expect(page.locator('[data-tela="encerramento"]')).toBeVisible();
    const tocados = await sons.lista();
    expect(tocados).not.toContain('acerto');
    expect(tocados).toContain('falta-pouco');
    expect(tocados).toContain('fim-de-tempo');
  });

  test('voz desligada: fala só no balão (US5 6)', async ({
    page,
    relogio,
    comDocumento,
    falas,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({
        settings: { voice: false },
        currentDay: { supervisionInviteShown: false },
      }),
    );
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText(/chame um adulto/i);
    await page.getByRole('button', { name: 'Mascote' }).click();
    expect(await falas.lista()).toEqual([]);
  });

  test('menos animação liga data-motion="reduced" (US5 7)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'reduced');
    await abrirPainel(page);
    await aba(page, 'Ajustes');
    await page.getByLabel('Menos animação').check();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  });

  test('trocar a senha com a senha atual errada é recusado (US5 8)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await abrirPainel(page);
    await aba(page, 'Ajustes');
    await page.getByRole('button', { name: 'Trocar a senha' }).click();
    const credencial = (await lerDocumento(page))?.credential;
    await digitarSenha(page, '0000');
    await expect(alerta(page)).toHaveText('Senha atual incorreta');
    expect((await lerDocumento(page))?.credential).toEqual(credencial);
  });

  test('"Apagar todos os dados" esvazia o armazenamento e volta à configuração (US5 9, SC-010)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 1200 } }));
    await page.goto('/');
    await abrirPainel(page);
    await aba(page, 'Ajustes');
    await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
    await page.getByRole('button', { name: 'Confirmar e apagar' }).click();
    await expect(page.locator('[data-tela="configuracao"]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
  });
});

test.describe('painel: Registro e exportação (US6, SC-009, SC-010)', () => {
  const historico = () => {
    const registros = [];
    for (let atras = 40; atras >= 1; atras -= 1) {
      if (atras === 5) {
        continue;
      }
      registros.push({
        date: diaRelativo(-atras),
        usedSeconds: atras === 3 ? 0 : atras * 60,
        limitMin: 60,
        closureHappened: false,
      });
    }
    return registros;
  };

  test('7 barras, média, dias com uso, total e 30 dias; retenção de 30 dias', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({ currentDay: { usedSeconds: 25 * 60 }, history: historico() }),
    );
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    const gravado = (await lerDocumento(page))?.history as { date: string }[];
    expect(gravado.length).toBeLessThanOrEqual(30);
    expect(gravado.every((r) => r.date >= diaRelativo(-30))).toBe(true);

    await abrirPainel(page);
    await aba(page, 'Registro');
    const barras = page.getByRole('table', { name: 'Minutos de uso nos últimos 7 dias' });
    const minutos = await barras.locator('tbody td').allTextContents();
    expect(minutos.map(Number)).toEqual([6, 0, 4, 0, 2, 1, 25]);
    await expect(page.getByText('Média diária: 5,4 min')).toBeVisible();
    await expect(page.getByText('Dias com uso nos últimos 7 dias: 5 de 7')).toBeVisible();
    await expect(page.getByText('Total da semana: 38 min')).toBeVisible();
    const linhas = page.getByRole('table', { name: 'Últimos 30 dias' }).locator('tbody tr');
    await expect(linhas).toHaveCount(30);
    await expect(linhas.first()).toContainText('25');
    await expect(page.getByText(/sequência/i)).toHaveCount(0);
  });

  test('"Exportar" baixa o arquivo sem a credencial', async ({ page, relogio, comDocumento }) => {
    await relogio();
    await comDocumento(documentoValido({ history: historico().slice(-3) }));
    await page.goto('/');
    await abrirPainel(page);
    await aba(page, 'Registro');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`controle-parental-dados-${DATA_BASE}.json`);
    const caminho = await download.path();
    const texto = fs.readFileSync(caminho, 'utf8');
    const dados = JSON.parse(texto);
    expect(dados).toMatchObject({
      formato: 'controle-parental-exportacao',
      versaoFormato: 1,
      crianca: { apelido: 'Lia' },
      diaAtual: { data: DATA_BASE },
    });
    expect(dados.historico).toHaveLength(3);
    expect(texto).not.toContain('credential');
    expect(texto).not.toContain(CREDENCIAL.salt);
    expect(texto).not.toContain(CREDENCIAL.hash);
  });
});
