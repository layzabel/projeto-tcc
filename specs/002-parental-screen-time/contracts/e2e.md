# Contrato — Etapa `e2e` do comando único e convenções dos testes de ponta a ponta

Estende o contrato `npm run verify` da 001
([../../001-quality-metrics-infra/contracts/cli.md](../../001-quality-metrics-infra/contracts/cli.md));
as etapas 1 a 4 não mudam.

## `npm run verify` (após esta feature)

| # | Etapa | Comando interno | Código se falhar |
|---|---|---|---|
| 1 | `tipos` | inalterado | 1 |
| 2 | `padroes` | inalterado | 2 |
| 3 | `testes` | inalterado (`vitest run --coverage`) | 3 |
| 4 | `build` | inalterado (`next build` + `generate-sw.ts`) | 4 |
| 5 | `e2e` | `npx playwright test` | 5 |

- Sucesso: `VERIFY OK: 5/5 etapas`, código 0. Demais mensagens como na 001.
- Pré-requisito único na máquina: `npx playwright install chromium` (uma vez). Sem o navegador
  instalado, o Playwright falha com sua própria mensagem e a etapa `e2e` sai com código 5.
- Script avulso: `npm run e2e` (= `playwright test`), usando o `out/` já gerado.

## Execução

- `playwright.config.ts` (raiz): `testDir: 'tests/e2e'`, `fullyParallel: false`, `workers: 1`,
  `retries: 0`, projeto `chromium`; `webServer` = `node scripts/e2e/serve-out.ts`, que serve `out/`
  em `http://127.0.0.1:4310` (só *loopback*; `/` → `index.html`; tipos MIME corretos para `.js`,
  `.webmanifest`, `.svg`, `.png`; nenhum outro comportamento).
- Viewports: `celular` 390×844 (padrão), `estreito` 320×640, `desktop` 1280×800.
- Serviço de voz: os testes substituem `speechSynthesis` por um registrador via `addInitScript`
  (as falas são verificadas pelo balão e pelo registrador, não por áudio real).

## Fixture obrigatória `semRedeExterna`

Todos os testes usam a fixture base de `tests/e2e/fixtures.ts`, que:

1. Registra `context.on('request')`; qualquer URL cuja origem não seja `http://127.0.0.1:4310` e
   que não seja `blob:` ou `data:` é anotada;
2. Ao fim do teste, falha se houver anotação, listando as URLs (SC-011).

## Fixture de estado

- `estadoVazio`: limpa `localStorage` antes do primeiro carregamento.
- `comDocumento(doc)`: grava o documento (contrato [storage-schema.md](storage-schema.md)) por
  `addInitScript` antes do primeiro carregamento.
- `relogio`: `page.clock.install({ time })` antes de navegar; os testes usam `runFor` para tempo
  contado e `setSystemTime` para saltos do relógio de parede (SC-002, SC-003).

## Mapeamento mínimo de testes E2E

| Arquivo | Cobre |
|---|---|
| `configuracao.spec.ts` | US1, SC-001 (nada gravado antes do aceite; sem tela infantil antes da conclusão) |
| `contagem.spec.ts` | US2 cenários 5–9, SC-002, SC-003, SC-004, FR-020 (duas abas) |
| `encerramento.spec.ts` | US3, SC-006, SC-007 (3 estilos, reinício, bloqueio após recarga, liberação à meia-noite) |
| `acesso-adulto.spec.ts` | US4, SC-008 |
| `painel.spec.ts` | US5, US6, SC-009, SC-010 (exportação via evento `download`; apagar → `localStorage` vazio) |
| `atividades.spec.ts` | US7, US8 (sorteio fixado por `addInitScript` em `crypto.getRandomValues`) |
| `supervisao.spec.ts` | FR-006a, SC-015 |
| `offline.spec.ts` | FR-047, SC-011 (service worker ativo → `setOffline(true)` → recarga e uso) |
| `toque.spec.ts` | SC-012 (320, 390, 1280 px) |
| `acessibilidade.spec.ts` | SC-013 (axe: WCAG 2.1 AA nas telas do adulto; `color-contrast` nas infantis) |
