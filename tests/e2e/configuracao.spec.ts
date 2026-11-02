import { alerta, CHAVE, digitarSenha, expect, lerDocumento, test } from './fixtures';

test.beforeEach(async ({ estadoVazio }) => {
  await estadoVazio();
});

const telaInfantil = '[data-tela="mundo"], [data-tela="jogo"], [data-tela="historia"]';

test('nenhuma tela infantil antes da conclusão; recusar não grava nada (US1 1–2, SC-001)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-tela="configuracao"]')).toBeVisible();
  await expect(page.locator(telaInfantil)).toHaveCount(0);
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Não aceito' }).click();
  await expect(alerta(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(page.locator(telaInfantil)).toHaveCount(0);
});

test('aceite grava só o consentimento (US1 3, SC-001)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();
  await expect(page.getByLabel('Apelido ou primeiro nome (opcional)')).toBeVisible();
  const doc = await lerDocumento(page);
  expect(Object.keys(doc ?? {}).sort()).toEqual(['consent', 'schemaVersion', 'setupCompleted']);
  expect(doc).toMatchObject({ schemaVersion: 1, setupCompleted: false });
  const consent = doc?.consent as { acceptedAt: string; textVersion: string };
  expect(Object.keys(consent).sort()).toEqual(['acceptedAt', 'textVersion']);
  expect(Number.isFinite(Date.parse(consent.acceptedAt))).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(1);
});

test('fluxo completo até o mundo da criança (US1 4–7)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();

  const apelido = page.getByLabel('Apelido ou primeiro nome (opcional)');
  await expect(page.getByText(/não informe o nome completo/i)).toBeVisible();
  await apelido.pressSequentially('Abcdefghijklmnopqrstuvwxy');
  await expect(apelido).toHaveValue('Abcdefghijklmnopqr');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByLabel('60 minutos')).toBeChecked();
  const valores = await page
    .getByRole('radio')
    .evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)));
  expect(valores).toEqual([15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  await expect(page.getByText(/Sociedade Brasileira de Pediatria/)).toBeVisible();
  await page.getByLabel('30 minutos').check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await digitarSenha(page, '1234');
  await digitarSenha(page, '9999');
  await expect(alerta(page)).toHaveText('As senhas não coincidem');
  expect((await lerDocumento(page))?.credential).toBeUndefined();

  await digitarSenha(page, '1234');
  await digitarSenha(page, '1234');
  await expect(page.getByText(/adulto por perto/i)).toBeVisible();
  await page.getByRole('button', { name: 'Começar', exact: true }).click();

  await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  const doc = await lerDocumento(page);
  expect(doc).toMatchObject({
    setupCompleted: true,
    profile: { nickname: 'Abcdefghijklmnopqr' },
    settings: { dailyLimitMin: 30 },
    currentDay: { limitMin: 30, usedSeconds: 0 },
  });
  const texto = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE);
  expect(texto).not.toContain('1234');
});

test('recarregar no meio recomeça nas boas-vindas e remove o documento incompleto (US1 8)', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  expect(await lerDocumento(page)).not.toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Começar a configuração' })).toBeVisible();
  await expect(page.locator(telaInfantil)).toHaveCount(0);
  expect(await lerDocumento(page)).toBeNull();
});
