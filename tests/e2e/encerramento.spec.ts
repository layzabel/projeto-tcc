import { documentoValido, expect, lerDia, test, type DocParcial } from './fixtures';
import type { Page } from '@playwright/test';

const etapa = (page: Page) => page.locator('[data-tela="encerramento"]');

function quaseNoFim(estilo: string, extra: DocParcial = {}) {
  return documentoValido({
    settings: { closureStyle: estilo },
    currentDay: { usedSeconds: 3600 - 3 },
    ...extra,
  });
}

async function esgotar(page: Page) {
  await page.clock.runFor(5000);
  await expect(etapa(page)).toBeVisible();
}

async function escolherCartao(page: Page) {
  await expect(etapa(page)).toHaveAttribute('data-etapa', 'escolha');
  await page.getByRole('button', { name: 'Brincar com um brinquedo' }).click();
  await page.clock.runFor(3500);
}

async function lerHistoria(page: Page) {
  for (let i = 0; i < 6; i += 1) {
    await page.getByRole('button', { name: 'Tocar na história' }).click();
    await page.getByRole('button', { name: 'Próxima página' }).click();
  }
}

test.describe('encerramento e bloqueio (US3, SC-006, SC-007)', () => {
  test('respiração: aviso → 3 respirações → elogio → escolha → despedida → bloqueio', async ({
    page,
    relogio,
    comDocumento,
    falas,
    sons,
  }) => {
    await relogio();
    await comDocumento(quaseNoFim('respiracao'));
    await page.goto('/');
    await esgotar(page);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'aviso');
    expect(await falas.lista()).toContain(
      'Lia, chegou a hora de guardar a tela. Vamos nos despedir?',
    );
    await page.mouse.click(5, 400);
    await expect.poll(() => sons.lista()).toContain('fim-de-tempo');
    await page.clock.runFor(5000);
    for (let i = 0; i < 3; i += 1) {
      await expect(etapa(page)).toHaveAttribute('data-etapa', 'respiracao');
      await expect(page.locator('[data-fase]')).toHaveAttribute('data-fase', 'inspira');
      await page.clock.runFor(4000);
      await expect(page.locator('[data-fase]')).toHaveAttribute('data-fase', 'solta');
      await page.clock.runFor(4000);
    }
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'elogio');
    await page.clock.runFor(5000);
    await escolherCartao(page);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'despedida');
    await page.clock.runFor(4000);
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    expect((await lerDia(page)).closure).toBe('concluido');
  });

  test('historinha: história de 6 páginas entre o aviso e o elogio', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(quaseNoFim('historinha'));
    await page.goto('/');
    await esgotar(page);
    await page.clock.runFor(5000);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'historia');
    await lerHistoria(page);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'elogio');
    await page.clock.runFor(5000);
    await escolherCartao(page);
    await page.clock.runFor(4000);
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
  });

  test('simples: aviso seguido do elogio; tempo não avança no encerramento nem no bloqueio', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(quaseNoFim('simples'));
    await page.goto('/');
    await esgotar(page);
    await page.clock.runFor(5000);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'elogio');
    expect((await lerDia(page)).usedSeconds).toBe(3600);
    await page.clock.runFor(5000);
    await escolherCartao(page);
    await page.clock.runFor(4000);
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    await page.clock.runFor(10 * 60_000);
    expect((await lerDia(page)).usedSeconds).toBe(3600);
  });

  test('tempo acabando dentro do jogo leva imediatamente ao encerramento', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(quaseNoFim('simples', { currentDay: { usedSeconds: 3600 - 10 } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Brincar' }).click();
    await expect(page.locator('[data-tela="jogo"]')).toBeVisible();
    await page.clock.runFor(12_000);
    await expect(etapa(page)).toBeVisible();
  });

  test('recarga no meio recomeça do aviso; bloqueio persiste após recarga', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(quaseNoFim('respiracao'));
    await page.goto('/');
    await esgotar(page);
    await page.clock.runFor(9000);
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'respiracao');
    await page.reload();
    await expect(etapa(page)).toHaveAttribute('data-etapa', 'aviso');
    expect((await lerDia(page)).closure).toBe('em-andamento');

    for (const ms of [5000, 4000, 4000, 4000, 4000, 4000, 4000, 5000]) {
      await page.clock.runFor(ms);
    }
    await escolherCartao(page);
    await page.clock.runFor(4000);
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    await expect(page.locator('[data-tela="mundo"]')).toHaveCount(0);
  });

  test('meia-noite com a aplicação aberta libera o bloqueio para o mundo', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio(new Date('2026-11-02T23:59:00-03:00'));
    await comDocumento(
      documentoValido({ currentDay: { usedSeconds: 3600, closure: 'concluido' } }),
    );
    await page.goto('/');
    await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
    await expect(page.locator('[data-ceu]')).toHaveAttribute('data-ceu', 'noite');
    await expect(page.locator('[data-humor]')).toHaveAttribute('data-humor', 'dormindo');
    await page.clock.runFor(90_000);
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    expect(await lerDia(page)).toMatchObject({ date: '2026-11-03', usedSeconds: 0 });
  });
});
