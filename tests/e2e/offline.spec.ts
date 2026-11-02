import { digitarSenha, expect, test } from './fixtures';

test.use({ serviceWorkers: 'allow' });

test('funciona sem internet depois do primeiro acesso (FR-047, SC-011)', async ({
  page,
  context,
  estadoVazio,
}) => {
  await estadoVazio();
  await page.goto('/');
  await expect(page.locator('[data-tela="configuracao"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-tela="configuracao"]')).toBeVisible();
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await digitarSenha(page, '1357');
  await digitarSenha(page, '1357');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  await page.getByRole('button', { name: 'Brincar' }).click();
  await expect(page.locator('[data-tela="jogo"]')).toBeVisible();
  await expect(page.locator('button[data-brinquedo]')).toHaveCount(6);
});
