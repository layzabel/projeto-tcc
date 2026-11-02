import { digitarSenha, documentoValido, expect, lerDia, test } from './fixtures';

const CONVITE = /chame um adulto/i;

test('convite exatamente uma vez por dia, inclusive após recargas, e de novo após a virada (FR-006a, SC-015)', async ({
  page,
  relogio,
  comDocumento,
  falas,
}) => {
  await relogio(new Date('2026-11-02T23:58:00-03:00'));
  await comDocumento(documentoValido({ currentDay: { supervisionInviteShown: false } }));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText(CONVITE);
  expect((await falas.lista()).filter((f) => CONVITE.test(f))).toHaveLength(1);
  expect((await lerDia(page)).supervisionInviteShown).toBe(true);

  await page.reload();
  await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText(CONVITE);
  expect((await falas.lista()).filter((f) => CONVITE.test(f))).toHaveLength(0);

  await page.clock.runFor(3 * 60_000);
  await page.reload();
  await expect(page.getByRole('status')).toContainText(CONVITE);
  expect((await lerDia(page)).date).toBe('2026-11-03');
});

test('orientação de uso supervisionado na conclusão da configuração (SC-015)', async ({
  page,
  estadoVazio,
}) => {
  await estadoVazio();
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar a configuração' }).click();
  await page.getByRole('button', { name: 'Aceito', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await digitarSenha(page, '2468');
  await digitarSenha(page, '2468');
  await expect(page.getByText(/com um adulto por perto/i)).toBeVisible();
});
