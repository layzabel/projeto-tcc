import type { Page } from '@playwright/test';
import { documentoValido, expect, test } from './fixtures';

const brinquedos = (page: Page) => page.locator('button[data-brinquedo]');

async function guardar(page: Page, certo: boolean) {
  const brinquedo = brinquedos(page).first();
  const cor = await brinquedo.getAttribute('data-cor');
  const caixa = (cor === 'azul') === certo ? 'Caixa azul' : 'Caixa vermelha';
  await brinquedo.click();
  await page.getByRole('button', { name: caixa }).click();
}

test.describe('jogo "Guardar os brinquedos" (US7)', () => {
  test('acertos, erro sem penalidade, comemoração e volta ao mundo (US7 1–4)', async ({
    page,
    relogio,
    comDocumento,
    fixarSorteio,
  }) => {
    await relogio();
    await fixarSorteio([0.1, 0.8, 0.3, 0.6, 0.45, 0.2, 0.7, 0.9, 0.4, 0.05, 0.55]);
    await comDocumento(documentoValido());
    await page.goto('/');
    await page.getByRole('button', { name: 'Brincar' }).click();
    await expect(page.locator('[data-tela="jogo"]')).toBeVisible();
    await expect(brinquedos(page)).toHaveCount(6);
    const cores = await brinquedos(page).evaluateAll((els) => els.map((e) => e.dataset.cor));
    expect(new Set(cores)).toEqual(new Set(['azul', 'vermelho']));

    await guardar(page, true);
    await expect(brinquedos(page)).toHaveCount(5);
    await guardar(page, false);
    await expect(brinquedos(page)).toHaveCount(5);
    await expect(page.getByRole('status')).toContainText(/tente/i);
    await expect(page.locator('.progresso-jogo [data-cheio="true"]')).toHaveCount(1);

    for (let i = 0; i < 5; i += 1) {
      await guardar(page, true);
    }
    await expect(page.locator('[data-humor]')).toHaveAttribute('data-humor', 'festejando');
    await page.clock.runFor(3500);
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  });

  test('o botão voltar retorna ao mundo (US7 5)', async ({ page, relogio, comDocumento }) => {
    await relogio();
    await comDocumento(documentoValido());
    await page.goto('/');
    await page.getByRole('button', { name: 'Brincar' }).click();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  });
});

test.describe('história interativa (US8)', () => {
  const CENARIOS = ['dia', 'tarde', 'tarde', 'anoitecer', 'anoitecer', 'noite'];

  test('6 páginas com cenário, frase falada, efeito e avanço; fim volta ao mundo (US8 1–3)', async ({
    page,
    relogio,
    comDocumento,
    falas,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 0 } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'História' }).click();
    await expect(page.locator('[data-tela="historia"]')).toBeVisible();
    for (const [i, cenario] of CENARIOS.entries()) {
      await expect(page.locator('[data-ceu]')).toHaveAttribute('data-ceu', cenario);
      const frase = (await page.getByRole('status').textContent()) ?? '';
      expect(frase.length).toBeGreaterThan(0);
      expect(await falas.lista()).toContain(frase);
      await expect(page.locator('.dica-toque')).toBeVisible();
      await page.getByRole('button', { name: 'Tocar na história' }).click();
      await expect(page.locator('[data-efeito]')).toBeVisible();
      await page.getByRole('button', { name: 'Próxima página' }).click();
      if (i < CENARIOS.length - 1) {
        await expect(page.getByRole('status')).not.toHaveText(frase);
      }
    }
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  });

  test('o tempo continua contando durante a história avulsa', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 0 } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'História' }).click();
    await expect(page.locator('[data-tela="historia"]')).toBeVisible();
    await page.clock.runFor(60_000);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const dia = await page.evaluate(
      () => JSON.parse(localStorage.getItem('tcc-cp:v1')!).currentDay,
    );
    expect(dia.usedSeconds).toBeGreaterThanOrEqual(55);
  });
});
