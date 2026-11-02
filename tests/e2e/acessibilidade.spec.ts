import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { digitarSenha, documentoValido, expect, SENHA, segurarBotaoAdulto, test } from './fixtures';

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * O axe usa temporizadores; com o relógio da página parado, avança-o em passos de 20 ms enquanto a
 * análise roda (sem efeito nos testes sem relógio instalado).
 */
async function analisar(page: Page, builder: AxeBuilder) {
  let terminou = false;
  const resultado = builder.analyze().finally(() => {
    terminou = true;
  });
  while (!terminou) {
    await page.clock.runFor(20).catch(() => undefined);
  }
  return resultado;
}

async function semViolacoesAA(page: Page, tela: string) {
  const { violations } = await analisar(page, new AxeBuilder({ page }).withTags(WCAG_AA));
  expect(violations.map((v) => `${tela}: ${v.id} (${v.nodes.length})`)).toEqual([]);
}

async function semViolacoesContraste(page: Page, tela: string) {
  const { violations } = await analisar(
    page,
    new AxeBuilder({ page }).withRules(['color-contrast']),
  );
  expect(
    violations.map((v) => `${tela}: ${v.id} ${v.nodes.map((n) => n.target).join(' ')}`),
  ).toEqual([]);
}

/** Avança o relógio em passos curtos até a etapa pedida (cada etapa agenda a seguinte). */
async function avancarAte(page: Page, etapa: string) {
  const tela = page.locator('[data-tela="encerramento"]');
  for (let i = 0; i < 15 && (await tela.getAttribute('data-etapa')) !== etapa; i += 1) {
    await page.clock.runFor(2000);
  }
  await expect(tela).toHaveAttribute('data-etapa', etapa);
}

test('configuração: WCAG 2.1 AA em cada passo (SC-013)', async ({ page, estadoVazio }) => {
  await estadoVazio();
  await page.goto('/');
  await semViolacoesAA(page, 'boas-vindas');
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await semViolacoesAA(page, 'consentimento');
  await page.getByRole('button', { name: 'Não aceito' }).click();
  await semViolacoesAA(page, 'consentimento recusado');
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();
  await semViolacoesAA(page, 'apelido');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await semViolacoesAA(page, 'limite');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await semViolacoesAA(page, 'senha');
  await digitarSenha(page, '1234');
  await digitarSenha(page, '4321');
  await semViolacoesAA(page, 'senha divergente');
  await digitarSenha(page, '1234');
  await digitarSenha(page, '1234');
  await expect(page.getByRole('button', { name: 'Começar', exact: true })).toBeVisible();
  await semViolacoesAA(page, 'conclusão');
});

test('senha, recuperação e as três abas do painel: WCAG 2.1 AA (SC-013)', async ({
  page,
  relogio,
  comDocumento,
}) => {
  await relogio();
  await comDocumento(documentoValido({ currentDay: { usedSeconds: 1500 } }));
  await page.goto('/');
  await segurarBotaoAdulto(page);
  await semViolacoesAA(page, 'senha');
  await digitarSenha(page, '0000');
  await semViolacoesAA(page, 'senha incorreta');
  await page.getByRole('button', { name: 'Esqueci a senha' }).click();
  await semViolacoesAA(page, 'recuperação');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await segurarBotaoAdulto(page);
  await digitarSenha(page, SENHA);
  for (const aba of ['Hoje', 'Ajustes', 'Registro']) {
    await page.getByRole('tab', { name: aba }).click();
    await semViolacoesAA(page, `painel/${aba}`);
  }
  await page.getByRole('tab', { name: 'Hoje' }).click();
  await page.getByRole('button', { name: 'Encerrar agora' }).click();
  await semViolacoesAA(page, 'confirmação de encerramento');
});

test('telas infantis: contraste AA (SC-013)', async ({ page, relogio, comDocumento }) => {
  await relogio();
  await comDocumento(documentoValido({ currentDay: { usedSeconds: 3600 - 4 * 60 } }));
  await page.goto('/');
  await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  await semViolacoesContraste(page, 'mundo');
  await page.getByRole('button', { name: 'Brincar' }).click();
  await semViolacoesContraste(page, 'jogo');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'História' }).click();
  await semViolacoesContraste(page, 'historia');
  await page.clock.runFor(4 * 60_000 + 2000);
  const encerramento = page.locator('[data-tela="encerramento"]');
  await expect(encerramento).toBeVisible();
  for (const etapa of ['aviso', 'respiracao', 'elogio', 'escolha']) {
    await avancarAte(page, etapa);
    await semViolacoesContraste(page, `encerramento/${etapa}`);
  }
  await page.getByRole('button', { name: 'Ver um livro' }).click();
  await page.clock.runFor(3500);
  await semViolacoesContraste(page, 'encerramento/despedida');
  await page.clock.runFor(4100);
  await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
  await semViolacoesContraste(page, 'bloqueio');
});
