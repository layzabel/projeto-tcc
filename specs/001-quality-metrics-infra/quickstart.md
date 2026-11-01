# Quickstart — Validação da Infraestrutura de Qualidade e Métricas

Guia de execução e checklist de aceitação. Comandos e códigos de saída em
[contracts/cli.md](contracts/cli.md); formato do arquivo de métricas em
[contracts/metricas-ia-format.md](contracts/metricas-ia-format.md); escopos em
[contracts/sonar-scopes.md](contracts/sonar-scopes.md).

## Pré-requisitos

- Windows 11, Node.js 24 LTS (`node --version` → `v24.x`; `.nvmrc` = `24`).
- Docker Desktop em execução.
- `SONAR_TOKEN` definido na sessão (PowerShell: `$env:SONAR_TOKEN = '<token>'`), nunca em arquivo
  versionado.
- Acesso ao `npx` (o ccusage é baixado na versão fixada `20.0.46`).

## Setup

```powershell
npm ci
npm run sonar:up        # sobe sonarqube:community em http://localhost:9000
# passo manual da pesquisadora (uma vez): entrar na interface, trocar a senha do admin,
# gerar um token de usuário admin e defini-lo em $env:SONAR_TOKEN
npm run sonar:setup     # perfil, Quality Gate e os 2 projetos
```

## Cenário 1 — Comando único passa (US1, SC-001)

```powershell
npm run verify; $LASTEXITCODE
```

Esperado: `VERIFY OK: 4/4 etapas`, código `0`, `coverage/index.html` e `coverage/lcov.info`
gerados, `out/index.html`, `out/manifest.webmanifest` e `out/sw.js` gerados.

## Cenário 2 — Cada etapa faz o comando falhar (SC-002)

Automatizado: `tests/unit/scripts/verify.test.ts` (sequência, parada e código por etapa).
Checklist com injeção real (desfazer cada alteração depois):

| # | Injeção | Esperado |
|---|---|---|
| 2a | `const x: number = 'a';` em `src/app/page.tsx` | `VERIFY FALHOU: etapa=tipos (código 1)` |
| 2b | copiar `tests/fixtures/complexity/cyclomatic-11.ts` para `src/lib/` | `etapa=padroes (código 2)`, mensagem com arquivo, linha e coluna (e nome da função, quando a regra informa) |
| 2c | `expect(1).toBe(2)` num teste | `etapa=testes (código 3)`, nome do teste na saída |
| 2d | `export const dynamic = 'force-dynamic'` em `src/app/page.tsx` (incompatível com `output: 'export'`) | `etapa=build (código 4)` |

## Cenário 3 — Limites de complexidade (SC-003)

```powershell
npx vitest run tests/unit/scripts/complexity-rules.test.ts
```

Esperado: ciclomática 11 e cognitiva 16 sinalizadas; 10 e 15 não sinalizadas (4/4). As fixtures
usam só `if`, `for`, `while`, `&&` e `||`, contados igualmente pelo ESLint e pelo SonarQube (R6).
O cálculo dos máximos por função sobre as mesmas fixtures é coberto por
`tests/unit/scripts/max-complexity.test.ts`.

## Cenário 4 — Análise SonarQube e escopo (US2, SC-004)

```powershell
npm run verify
npm run sonar -- --etapa implement
```

Esperado: duas análises concluídas, verificação de escopo OK, 2 linhas novas na tabela SonarQube de
`specs/001-quality-metrics-infra/metricas-ia.md` (app e scripts), a primeira de cada escopo com
`linha_base = sim` (SC-007).

Falha controlada (US2-3): `docker compose stop sonarqube`, rodar `npm run sonar -- --etapa implement`
→ código `10`, mensagem de servidor indisponível, arquivo de métricas inalterado (comparar hash
antes/depois com `Get-FileHash`).

## Cenário 5 — Registro de IA (US3, SC-005, SC-006)

Numa sessão de registro (aberta só para isso, depois que a sessão da etapa terminou — FR-011b):

```powershell
npx -y ccusage@20.0.46 session --json --offline   # localizar o ID da sessão da etapa
npm run metrics:ia -- --etapa plan --sessao <id> --correcoes 0
npm run metrics:ia -- --etapa registro --sessao <id da sessão de registro anterior> --correcoes 0
npm run metrics:check
```

Esperado: 1 linha nova na tabela de IA por registro; `metrics:check` com código `0` (100%
idênticos). A lógica do verificador (divergência → `30`) é coberta por
`tests/unit/scripts/check-ia.test.ts`.
SC-006 automatizado em `tests/unit/scripts/metrics-table.test.ts` (2 gravações seguidas, linhas
anteriores idênticas; interrupção simulada antes do `rename` deixa o arquivo original intacto).

Falhas controladas: `--sessao 00000000-0000-0000-0000-000000000000` → código `22`, nada gravado;
`--sessao <ID da sessão atual>` → código `21`.

## Cenário 6 — Registro retroativo (FR-020)

```powershell
npm run metrics:ia -- --etapa constitution+specify --sessao <id> --retroativo --correcoes <n>
```

Roda na primeira sessão de registro depois do fim de implement (FR-020), nunca dentro de
implement. Repetir para cada sessão histórica (constitution, specify, clarify, plan, tasks,
analyze). A etapa analyze reúne todas as sessões de análise e de correção dos apontamentos
(`--etapa analyze --sessao <id1>,<id2>,…`). Esperado: linhas com `tipo = retroativo` e IDs de
origem. `implement` não é retroativa: é registrada na mesma sessão de registro, sem `--retroativo`.

## Cenário 7 — Consolidado (FR-018)

```powershell
npm run metrics:consolidar
```

Esperado: `docs/metricas/consolidado.md` com seção "Escopo app — base da comparação com o braço de
vibe coding" separada da seção do escopo scripts, e as linhas `registro` somadas na seção de custo
de medição, fora dos totais das etapas.

## Cenário 8 — Segredos (SC-008)

Coberto por `tests/unit/scripts/secrets.test.ts` dentro de `npm run verify` (com `SONAR_TOKEN`
definido, o teste também procura o valor exato).

## Cenário 9 — Privacidade do esqueleto (Princípio II)

`npx serve out` (ou qualquer servidor estático local), abrir no navegador com DevTools › Network:
nenhuma requisição para fora de `localhost`, inclusive as feitas pelo service worker. CSP presente
no `<head>` de `out/index.html`.

## Cenário 10 — Funcionamento offline (FR-021, SC-009, Princípio II)

Automatizado: `tests/unit/scripts/generate-sw.test.ts` (lista de cache = 100% dos arquivos de
`out/`, versão determinística, marcadores substituídos) e `tests/unit/app/sw-register.test.tsx`
(registro de `/sw.js`).

Checklist no navegador:

```powershell
npm run verify
npx serve out
```

| # | Passo | Esperado |
|---|---|---|
| 10a | Abrir `http://localhost:3000`; DevTools › Application › Service workers | `sw.js` ativado e em execução |
| 10b | Application › Manifest | nome, idioma `pt-BR` e ícone detectados, sem erros |
| 10c | Application › Cache storage | um único cache `tcc-<versão>` com as URLs da lista de `out/sw.js` |
| 10d | Parar o `npx serve` (Ctrl+C) e recarregar a página | "Em construção" abre do cache, sem erro de rede |
| 10e | Alterar o texto do parágrafo, `npm run build`, servir de novo e recarregar duas vezes; depois desfazer a alteração e gerar de novo | só o cache da versão nova permanece |

## Critério de conclusão

Cenários 1–10 aprovados, Quality Gate `TCC` `OK` nos dois escopos e `metricas-ia.md` com linhas de
IA de todas as etapas e snapshot SonarQube. As sessões de registro não entram nesse critério: a
última delas é registrada pela primeira sessão de registro posterior (FR-011b).
