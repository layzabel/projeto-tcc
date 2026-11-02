import {
  alerta,
  digitarSenha,
  documentoValido,
  expect,
  lerDocumento,
  segundosUsados,
  SENHA,
  test,
} from './fixtures';
import type { Page } from '@playwright/test';

const BOTAO = 'Sou o adulto: segure por 3 segundos';
const teclado = (page: Page) => page.getByRole('group', { name: 'Senha do adulto' });

async function segurar(page: Page, ms: number) {
  const botao = page.getByRole('button', { name: BOTAO });
  await botao.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true });
  await page.clock.runFor(ms);
  // segurar 3 s abre a área do adulto, que substitui a tela e o botão
  if ((await botao.count()) > 0) {
    await botao.dispatchEvent('pointerup', { pointerId: 1, isPrimary: true });
  }
}

async function entrar(page: Page) {
  await segurar(page, 3100);
  await expect(teclado(page)).toBeVisible();
  await digitarSenha(page, SENHA);
  await expect(page.getByRole('tablist')).toBeVisible();
}

test.describe('acesso à área dos adultos (US4, SC-008)', () => {
  test('soltar antes de 3 s não abre; 3 s abre o teclado', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await segurar(page, 2500);
    await page.clock.runFor(2000);
    await expect(teclado(page)).toHaveCount(0);
    await segurar(page, 3100);
    await expect(teclado(page)).toBeVisible();
  });

  test('senha errada mostra mensagem e limpa; certa abre o painel e pausa a contagem', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 600 } }));
    await page.goto('/');
    await segurar(page, 3100);
    await digitarSenha(page, '0000');
    await expect(alerta(page)).toHaveText('Senha incorreta');
    await expect(page.locator('.pin-pontos [data-cheio="true"]')).toHaveCount(0);
    await digitarSenha(page, SENHA);
    await expect(page.getByRole('tablist')).toBeVisible();
    const antes = await segundosUsados(page);
    await page.clock.runFor(60_000);
    expect(await segundosUsados(page)).toBe(antes);
  });

  test('recuperação por multiplicação troca a senha', async ({
    page,
    relogio,
    comDocumento,
    fixarSorteio,
  }) => {
    await relogio();
    await fixarSorteio([0, 0, 0.5, 0.5]);
    await comDocumento(documentoValido());
    await page.goto('/');
    await segurar(page, 3100);
    await page.getByRole('button', { name: 'Esqueci a senha' }).click();
    const conta = page.getByText(/Quanto é \d{2} × \d\?/);
    await expect(conta).toBeVisible();
    const [, a, b] = /(\d{2}) × (\d)/.exec((await conta.textContent()) ?? '')!;
    await page.getByLabel(/Resultado/).fill(String(Number(a) * Number(b) + 1));
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(alerta(page)).toContainText(/errad/i);
    const credAntes = (await lerDocumento(page))?.credential;

    const [, c, d] = /(\d{2}) × (\d)/.exec((await conta.textContent()) ?? '')!;
    await page.getByLabel(/Resultado/).fill(String(Number(c) * Number(d)));
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await digitarSenha(page, '8642');
    await digitarSenha(page, '8642');
    await expect(page.getByRole('tablist')).toBeVisible();
    expect((await lerDocumento(page))?.credential).not.toEqual(credAntes);

    await page.getByRole('button', { name: 'Voltar' }).click();
    await segurar(page, 3100);
    await digitarSenha(page, SENHA);
    await expect(alerta(page)).toHaveText('Senha incorreta');
    await digitarSenha(page, '8642');
    await expect(page.getByRole('tablist')).toBeVisible();
  });

  test('voltar a partir do mundo leva ao mundo', async ({ page, relogio, comDocumento }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await entrar(page);
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  });

  test('voltar a partir do encerramento recomeça do aviso', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({
        settings: { closureStyle: 'simples' },
        currentDay: { usedSeconds: 3600, closure: 'em-andamento' },
      }),
    );
    await page.goto('/');
    await page.clock.runFor(5000);
    await expect(page.locator('[data-tela="encerramento"]')).toHaveAttribute(
      'data-etapa',
      'elogio',
    );
    await entrar(page);
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('[data-tela="encerramento"]')).toHaveAttribute('data-etapa', 'aviso');
  });

  test('voltar a partir do bloqueio continua no bloqueio', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(
      documentoValido({ currentDay: { usedSeconds: 3600, closure: 'concluido' } }),
    );
    await page.goto('/');
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    await entrar(page);
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
  });
});
