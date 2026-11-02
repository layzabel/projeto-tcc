import {
  DATA_BASE,
  definirVisibilidade,
  documentoValido,
  expect,
  lerDocumento,
  segundosUsados,
  test,
} from './fixtures';

const MIN = 60_000;

test.describe('contagem do tempo (US2, SC-002..004)', () => {
  test('12 min de 60 → 4 vaga-lumes acesos e céu de dia (US2 3)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 11 * 60 } }));
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    await expect(page.locator('[data-aceso="true"]')).toHaveCount(5);
    await page.clock.runFor(MIN + 1000);
    await expect(page.locator('[data-aceso="true"]')).toHaveCount(4);
    await expect(page.locator('[data-ceu]')).toHaveAttribute('data-ceu', 'dia');
  });

  test('aviso aos 5 min restantes: fala e mascote com sono, uma vez (US2 4)', async ({
    page,
    relogio,
    comDocumento,
    falas,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 54 * 60 } }));
    await page.goto('/');
    await expect(page.locator('[data-humor]')).toHaveAttribute('data-humor', 'calmo');
    await page.clock.runFor(MIN + 2000);
    await expect(page.locator('[data-humor]')).toHaveAttribute('data-humor', 'com-sono');
    await expect(page.getByText(/Faltam 5 minutos|Faltam 4 minutos/)).toBeVisible();
    const avisos = (await falas.lista()).filter((f) => /falta pouquinho/i.test(f));
    expect(avisos).toHaveLength(1);
    await page.clock.runFor(MIN);
    await page.reload();
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    const depois = (await falas.lista()).filter((f) => /falta pouquinho/i.test(f));
    expect(depois).toHaveLength(0);
  });

  test('10 min em segundo plano não contam (US2 5, SC-002)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 0 } }));
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    await page.clock.runFor(MIN);
    await definirVisibilidade(page, false);
    await page.clock.runFor(10 * MIN);
    await definirVisibilidade(page, true);
    await page.clock.runFor(MIN);
    await definirVisibilidade(page, false);
    const usado = await segundosUsados(page);
    expect(usado).toBeGreaterThanOrEqual(115);
    expect(usado).toBeLessThanOrEqual(125);
  });

  test('recarga mantém o tempo usado, com perda ≤ 5 s (US2 6, SC-004)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 0 } }));
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    await page.clock.runFor(20 * MIN);
    const antes = await segundosUsados(page);
    expect(antes).toBeGreaterThanOrEqual(20 * 60 - 5);
    await page.reload();
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    const depois = await segundosUsados(page);
    expect(depois).toBeGreaterThanOrEqual(antes);
    expect(depois).toBeLessThanOrEqual(20 * 60 + 5);
  });

  test('saltos do relógio de +2 h e −1 h alteram ≤ 5 s e nunca reduzem (US2 7, SC-003)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 600 } }));
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    await page.clock.runFor(10_000);
    await definirVisibilidade(page, false);
    const inicio = await segundosUsados(page);
    await definirVisibilidade(page, true);

    await page.clock.setSystemTime(new Date('2026-11-02T12:00:00-03:00'));
    await page.clock.runFor(1000);
    await definirVisibilidade(page, false);
    const aposMais2h = await segundosUsados(page);
    expect(aposMais2h).toBeGreaterThanOrEqual(inicio);
    expect(aposMais2h - inicio).toBeLessThanOrEqual(5);
    await definirVisibilidade(page, true);

    await page.clock.setSystemTime(new Date('2026-11-02T11:00:00-03:00'));
    await page.clock.runFor(1000);
    await definirVisibilidade(page, false);
    const aposMenos1h = await segundosUsados(page);
    expect(aposMenos1h).toBeGreaterThanOrEqual(aposMais2h);
    expect(aposMenos1h - aposMais2h).toBeLessThanOrEqual(5);
    expect((await lerDocumento(page))?.history).toEqual([]);
  });

  test('meia-noite arquiva o dia e zera; o novo limite só vale no dia seguinte (US2 8–9, SC-004)', async ({
    page,
    relogio,
    comDocumento,
  }) => {
    await relogio(new Date('2026-11-02T23:59:00-03:00'));
    await comDocumento(
      documentoValido({
        settings: { dailyLimitMin: 30 },
        currentDay: { usedSeconds: 900, limitMin: 60 },
      }),
    );
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    await page.clock.runFor(30_000);
    expect((await lerDocumento(page))?.currentDay).toMatchObject({ date: DATA_BASE, limitMin: 60 });
    await page.clock.runFor(MIN);
    await expect
      .poll(async () => ((await lerDocumento(page))?.currentDay as { date: string }).date)
      .toBe('2026-11-03');
    const doc = await lerDocumento(page);
    const historico = doc?.history as { date: string; usedSeconds: number; limitMin: number }[];
    expect(historico).toHaveLength(1);
    expect(historico[0]).toMatchObject({ date: DATA_BASE, limitMin: 60, closureHappened: false });
    expect(historico[0]!.usedSeconds).toBeGreaterThanOrEqual(900 + 55);
    expect(historico[0]!.usedSeconds).toBeLessThanOrEqual(900 + 65);
    expect(doc?.currentDay).toMatchObject({ limitMin: 30 });
    expect(Number((doc?.currentDay as { usedSeconds: number }).usedSeconds)).toBeLessThanOrEqual(
      35,
    );
  });

  test('duas abas não contam em dobro (FR-020)', async ({
    page,
    context,
    relogio,
    comDocumento,
  }) => {
    await relogio();
    await comDocumento(documentoValido({ currentDay: { usedSeconds: 0 } }));
    await page.goto('/');
    await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
    const outra = await context.newPage();
    await outra.goto('/');
    await expect(outra.locator('[data-tela="mundo"]')).toBeVisible();
    await page.clock.runFor(MIN);
    await definirVisibilidade(page, false);
    await definirVisibilidade(outra, false);
    const usado = await segundosUsados(page);
    expect(usado).toBeGreaterThanOrEqual(55);
    expect(usado).toBeLessThanOrEqual(65);
  });
});
