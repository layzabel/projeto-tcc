import type { Page } from '@playwright/test';
import { documentoValido, expect, test } from './fixtures';

type Caixa = { x: number; y: number; width: number; height: number };

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  { width: 844, height: 390 },
  { width: 640, height: 320 },
];

/** Distância entre retângulos: 0 se se sobrepõem ou se tocam. */
function distancia(a: Caixa, b: Caixa): number {
  const dx = Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width));
  const dy = Math.max(0, b.y - (a.y + a.height), a.y - (b.y + b.height));
  return Math.hypot(dx, dy);
}

async function medirAlvos(page: Page, tela: string) {
  const alvos = page.locator('[data-alvo-infantil]');
  const n = await alvos.count();
  expect(n, `alvos em ${tela}`).toBeGreaterThan(0);
  const caixas: Caixa[] = [];
  for (let i = 0; i < n; i += 1) {
    const caixa = await alvos.nth(i).boundingBox();
    expect(caixa, `alvo ${i} visível em ${tela}`).not.toBeNull();
    expect(caixa!.width, `largura do alvo ${i} em ${tela}`).toBeGreaterThanOrEqual(64);
    expect(caixa!.height, `altura do alvo ${i} em ${tela}`).toBeGreaterThanOrEqual(64);
    caixas.push(caixa!);
  }
  for (let i = 0; i < caixas.length; i += 1) {
    for (let j = i + 1; j < caixas.length; j += 1) {
      expect(
        distancia(caixas[i]!, caixas[j]!),
        `espaço entre ${i} e ${j} em ${tela}`,
      ).toBeGreaterThanOrEqual(8);
    }
  }
}

async function percorrerEncerramento(page: Page) {
  const tela = page.locator('[data-tela="encerramento"]');
  const vistas = new Set<string>();
  for (let passo = 0; passo < 12; passo += 1) {
    const etapa = await tela.getAttribute('data-etapa');
    if (etapa === null) {
      break;
    }
    if (!vistas.has(etapa)) {
      vistas.add(etapa);
      await medirAlvos(page, `encerramento/${etapa}`);
    }
    if (etapa === 'escolha') {
      await page.getByRole('button', { name: 'Desenhar' }).click();
      await page.clock.runFor(3500);
    } else if (etapa === 'despedida') {
      break;
    } else {
      await page.clock.runFor(4100);
    }
  }
  expect([...vistas]).toEqual(['aviso', 'respiracao', 'elogio', 'escolha', 'despedida']);
}

for (const viewport of VIEWPORTS) {
  test.describe(`alvos de toque em ${viewport.width}×${viewport.height} (SC-012, FR-049, FR-051)`, () => {
    test.use({ viewport });

    test('mundo, jogo e história', async ({ page, relogio, comDocumento }) => {
      await relogio();
      await comDocumento(documentoValido());
      await page.goto('/');
      await expect(page.locator('[data-tela="mundo"]')).toBeVisible();
      await medirAlvos(page, 'mundo');
      await page.getByRole('button', { name: 'Brincar' }).click();
      await medirAlvos(page, 'jogo');
      await page.getByRole('button', { name: 'Voltar' }).click();
      await page.getByRole('button', { name: 'História' }).click();
      await medirAlvos(page, 'historia');
    });

    test('cada etapa do encerramento e o bloqueio', async ({ page, relogio, comDocumento }) => {
      await relogio();
      await comDocumento(
        documentoValido({ currentDay: { usedSeconds: 3600, closure: 'em-andamento' } }),
      );
      await page.goto('/');
      await expect(page.locator('[data-tela="encerramento"]')).toBeVisible();
      await percorrerEncerramento(page);
      await page.clock.runFor(4100);
      await expect(page.locator('[data-tela="bloqueio"]')).toBeVisible();
      await medirAlvos(page, 'bloqueio');
    });
  });
}
