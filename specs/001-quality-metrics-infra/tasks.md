---

description: "Lista de tarefas da feature 001 — Infraestrutura de Qualidade e Métricas"
---

# Tasks: Infraestrutura de Qualidade e Métricas

**Input**: Documentos de design em `/specs/001-quality-metrics-infra/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: INCLUÍDOS. A spec exige verificação automatizada (SC-002, SC-003, SC-005, SC-006,
SC-008, SC-009) e o plano lista os arquivos de teste em `tests/unit/`.

**Organization**: tarefas agrupadas por user story; cada story é testável de forma independente
depois da fase Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: user story da tarefa (US1, US2, US3)
- Caminhos relativos à raiz do repositório (`C:\Projeto_TCC_final\my-project`)

## Convenções válidas para todas as tarefas

- Scripts em `scripts/**` são TypeScript executados direto pelo Node 24 (`node arquivo.ts`, *type
  stripping*): usar só sintaxe apagável (sem `enum`, `namespace`, parâmetros de propriedade),
  imports relativos com extensão `.ts`, `import type` para tipos. A mesma restrição de sintaxe vale
  para `src/pwa/sw.ts`.
- Toda mensagem impressa pelos scripts é em pt-BR. Nenhum script imprime o valor de `SONAR_TOKEN`
  (no máximo `SONAR_TOKEN definido: sim/não`).
- Cada função respeita ciclomática ≤ 10 e cognitiva ≤ 15; `any` explícito é proibido.
- Os pontos de entrada (`verify.ts`, `generate-sw.ts`, `record-ia.ts`, `check-ia.ts`,
  `analyze.ts` etc.) só fazem a ligação com `process.argv`/`process.exit`; a lógica fica em funções
  exportadas e testáveis com dependências injetadas (exec, fs, fetch, relógio, ESLint).
- "Prompt de correção" e "etapa `correcao-N`" seguem as definições do FR-011c; "sessão de
  registro" segue o FR-011b.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar o projeto Node/Next.js com a stack fixada no plano.

- [ ] T001 Criar `package.json` na raiz: `"name": "tcc-controle-parental"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=24 <25" }` e os scripts do [contracts/cli.md](contracts/cli.md): `typecheck` (`tsc --noEmit -p tsconfig.json && tsc --noEmit -p scripts/tsconfig.json && tsc --noEmit -p src/pwa/tsconfig.json`), `lint` (`eslint . --max-warnings=0`), `format:check` (`prettier --check .`), `format` (`prettier --write .`), `test` (`vitest run --coverage`), `build` (`next build && node scripts/pwa/generate-sw.ts`), `verify` (`node scripts/verify/verify.ts`), `sonar:up` (`node scripts/sonar/up.ts`), `sonar:setup` (`node scripts/sonar/setup.ts`), `sonar` (`node scripts/sonar/analyze.ts`), `metrics:ia` (`node scripts/metrics/record-ia.ts`), `metrics:check` (`node scripts/metrics/check-ia.ts`), `metrics:consolidar` (`node scripts/metrics/consolidate.ts`)
- [ ] T002 [P] Criar `.nvmrc` com o conteúdo `24` e `.gitignore` com `node_modules/`, `.next/`, `out/`, `coverage/`, `.scannerwork/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env*`, `*.md.tmp`
- [ ] T003 Instalar dependências fixando versões no `package.json`: runtime `next@16`, `react@19`, `react-dom@19`; dev `typescript@5`, `@types/node@24`, `@types/react@19`, `@types/react-dom@19`, `eslint@9`, `eslint-config-next@16`, `eslint-plugin-sonarjs`, `eslint-config-prettier`, `prettier`, `vitest@^3.2`, `@vitest/coverage-v8@^3.2` (3.2+ é necessário para `test.projects`), `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@sonar/scan` (gera `package-lock.json`; nada além disso — ver "Justificativa de dependências" no [plan.md](plan.md))
- [ ] T004 [P] Criar `tsconfig.json` (app + testes): `strict: true`, `noUncheckedIndexedAccess: true`, `noEmit: true`, `jsx: "preserve"`, `module: "esnext"`, `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`, plugin `next`, `paths` `@/*` → `src/*`, `include` `src/**`, `tests/**`, `next-env.d.ts`, `.next/types/**/*.ts`, `vitest.config.mts`; `exclude` `node_modules`, `scripts`, `tests/fixtures/**`, `src/pwa/sw.ts` (o service worker é verificado pelo T008, com `lib` webworker)
- [ ] T005 [P] Criar `scripts/tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noEmit: true`, `module: "nodenext"`, `moduleResolution: "nodenext"`, `target: "esnext"`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`, `types: ["node"]`, `include: ["**/*.ts"]` (R1)
- [ ] T006 [P] Criar `next.config.ts` com `output: 'export'`, `images: { unoptimized: true }`, `poweredByHeader: false` e nenhuma opção que faça rede (R16, Princípio II)
- [ ] T007 [P] Criar `prettier.config.mjs` (`singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'`) e `.prettierignore` com `node_modules/`, `.next/`, `out/`, `coverage/`, `.scannerwork/`, `package-lock.json`, `specs/`, `.specify/`, `.claude/`, `docs/metricas/` (arquivos de métricas são gerados por script e não podem ser reformatados — FR-016)
- [ ] T008 [P] Criar `src/pwa/tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noEmit: true`, `target: "esnext"`, `lib: ["esnext", "webworker"]`, `erasableSyntaxOnly: true`, `types: []`, `include: ["sw.ts"]` (R19)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ferramentas de padrões e testes, utilitários comuns dos scripts, esqueleto do app com
suporte offline e o gravador somente-acréscimo usado por US2 e US3.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

- [ ] T009 Criar `eslint.config.mjs` (flat config): `eslint-config-next` `core-web-vitals` + `typescript`; `eslint-plugin-sonarjs`; `eslint-config-prettier` por último; regras `complexity: ['error', 10]`, `sonarjs/cognitive-complexity: ['error', 15]`, `@typescript-eslint/no-explicit-any: 'error'`; `ignores`: `node_modules/**`, `.next/**`, `out/**`, `coverage/**`, `.scannerwork/**`, `next-env.d.ts`, `tests/fixtures/**` (fixtures só são lintadas pelos testes de T026 e T036, com `ignore: false`). Aplicar a configuração de `typescript-eslint` também a `scripts/**/*.ts` usando `scripts/tsconfig.json` e a `src/pwa/sw.ts` usando `src/pwa/tsconfig.json` quando houver regra com tipos (R3)
- [ ] T010 [P] Criar `vitest.config.mts`: plugin `@vitejs/plugin-react`; `test.projects` com dois projetos — `app` (`environment: 'jsdom'`, `include: ['tests/unit/app/**/*.test.tsx']`, `setupFiles: ['tests/setup/jest-dom.ts']`) e `scripts` (`environment: 'node'`, `include: ['tests/unit/scripts/**/*.test.ts']`); `coverage`: `provider: 'v8'`, `reporter: ['text', 'html', 'lcov']`, `reportsDirectory: 'coverage'`, `include: ['src/**', 'scripts/**']`, `exclude: ['**/*.d.ts']`, **sem `thresholds`** (clarificação: cobertura não faz o comando falhar — FR-004, R4)
- [ ] T011 [P] Criar `tests/setup/jest-dom.ts` importando `@testing-library/jest-dom/vitest`
- [ ] T012 Criar `src/app/layout.tsx`: `<html lang="pt-BR">`, `metadata.title` "Controle Parental — em construção", `<meta httpEquiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:">` no `<head>`; importar `./globals.css`; renderizar `<ServiceWorkerRegister />` (T021) no `<body>`; sem `next/font/google`, sem recurso remoto (R16)
- [ ] T013 [P] Criar `src/app/page.tsx` (página placeholder com `<main>` e `<h1>Em construção</h1>` e um parágrafo em pt-BR; sem estado, sem links externos, sem imagens remotas — FR-019) e `src/app/globals.css` com estilos mínimos usando fontes do sistema
- [ ] T014 [P] Implementar `scripts/lib/exec.ts`: `run(cmd: string, args: string[], opts?: { env?: Record<string,string>; capture?: boolean }): Promise<{ code: number; stdout: string; stderr: string }>` com `child_process.spawn`, `shell: process.platform === 'win32'` para resolver `npx`/`npm`/`.cmd` no Windows, `stdio: 'inherit'` quando `capture` é falso; repassa `process.env` + `env` + `NEXT_TELEMETRY_DISABLED=1`; nunca registra o ambiente nem os argumentos em log
- [ ] T015 [P] Implementar `scripts/lib/args.ts`: `parseArgs(argv)` sobre `node:util` `parseArgs` com as opções `--etapa`, `--sessao` (lista separada por `,`), `--correcoes` (inteiro ≥ 0), `--retroativo` (booleano), `--obs`, `--feature`; erro de argumento → mensagem em pt-BR e exceção tipada `ArgsError`
- [ ] T016 [P] Implementar `scripts/lib/feature.ts`: `resolveFeatureDir({ feature?, env, cwd })` → `--feature` se dado; senão `SPECIFY_FEATURE`; senão o diretório de `specs/` com maior prefixo numérico (`NNN-*`); falha clara se `specs/<feature>` não existir; exporta também `metricsFilePath(featureDir)` → `<featureDir>/metricas-ia.md`
- [ ] T017 Implementar `scripts/metrics/table.ts` conforme [contracts/metricas-ia-format.md](contracts/metricas-ia-format.md) e R14: constante `HEADER(feature)` com o cabeçalho exato do contrato (âncoras `<!-- tabela:ia -->`, `<!-- fim:ia -->`, `<!-- tabela:sonar -->`, `<!-- fim:sonar -->` e as duas linhas de cabeçalho de colunas literalmente como no contrato); `formatRow(cells: string[])` que recusa célula com "`|`" ou quebra de linha; `readRows(content, 'ia' | 'sonar')` → linhas de dados como objetos pelas colunas do cabeçalho; `appendRows(filePath, table, rows, fsDeps)` que (1) lê o arquivo ou parte do `HEADER` se ele não existe, (2) insere as linhas imediatamente antes de `<!-- fim:<tabela> -->`, (3) confere o invariante "linhas antigas == linhas novas − linhas inseridas, mesma ordem, byte a byte" e "exatamente N linhas a mais", (4) grava `metricas-ia.md.tmp` no mesmo diretório e (5) `fs.renameSync` sobre o original; qualquer violação aborta sem tocar o original; preserva o fim de linha existente (`\n` ou `\r\n`)
- [ ] T018 Escrever `tests/unit/scripts/metrics-table.test.ts` (SC-006 + interrupção) em diretório temporário (`fs.mkdtempSync(os.tmpdir())`): arquivo inexistente → criado com cabeçalho + 1 linha; duas gravações seguidas → linhas anteriores idênticas byte a byte (comparar o conteúdo anterior linha a linha); gravação na tabela `ia` não altera a tabela `sonar` e vice-versa; `rename` injetado que lança erro → original intacto (mesmo hash) e nenhuma linha parcial; célula com "`|`" ou `\n` → erro e arquivo intacto
- [ ] T019 [P] Criar `src/app/manifest.ts` (FR-021, R19): `export const dynamic = 'force-static'`; função padrão retornando `MetadataRoute.Manifest` com `name: 'Controle Parental'`, `short_name: 'Controle Parental'`, `lang: 'pt-BR'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `background_color` e `theme_color` locais e `icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }]`; criar `src/app/icon.svg` (ícone simples, sem recurso externo)
- [ ] T020 [P] Implementar `src/pwa/sw.ts` (FR-021, R19), sem imports nem exports: `const sw = self as unknown as ServiceWorkerGlobalScope`; marcadores `const VERSION: string = '__SW_VERSION__';` e `const PRECACHE: readonly string[] = ['__SW_PRECACHE__'];` (cada um uma única vez no arquivo); `CACHE = 'tcc-' + VERSION`; `install` → `caches.open(CACHE)` + `addAll(PRECACHE)` + `skipWaiting()`; `activate` → apaga os caches `tcc-*` diferentes de `CACHE` + `clients.claim()`; `fetch` → se o método não é `GET` ou a origem difere de `sw.location.origin`, retorna sem chamar `respondWith` (nenhuma requisição feita pelo SW para outra origem); senão `caches.match(request, { ignoreSearch: true })` ou `fetch(request)`; em navegação sem rede, responde `/index.html` do cache
- [ ] T021 [P] Implementar `src/pwa/register.ts` com `registerServiceWorker(container: Pick<ServiceWorkerContainer, 'register'> | undefined, enabled: boolean): Promise<boolean>` (registra `/sw.js` com `scope: '/'` só se `enabled` e `container` existirem; erro de registro → `false`, sem lançar e sem enviar nada à rede) e `src/app/sw-register.tsx` (`'use client'`, `useEffect` chamando `registerServiceWorker(navigator.serviceWorker, process.env.NODE_ENV === 'production')`, renderiza `null`)
- [ ] T022 Implementar `scripts/pwa/generate-sw.ts` (FR-021, R19): funções exportadas `listOutputFiles(outDir, fsDeps)` (todos os arquivos de `out/` exceto `sw.js`, como URLs `/` + caminho com `/`, mais `/` quando existir `index.html`, em ordem estável), `computeVersion(outDir, files, fsDeps)` (12 primeiros hex do SHA-256 dos caminhos e conteúdos ordenados) e `buildServiceWorker(source, version, urls)` (converte com `stripTypeScriptTypes` de `node:module`, troca `'__SW_VERSION__'` e `['__SW_PRECACHE__']` por JSON, erro se algum marcador não aparecer exatamente uma vez); o ponto de entrada lê `src/pwa/sw.ts`, grava `out/sw.js` e sai com código ≠ 0 e mensagem em pt-BR se `out/` não existir
- [ ] T023 Escrever `tests/unit/scripts/generate-sw.test.ts` (SC-009) em diretório temporário com `index.html`, `404.html`, `_next/static/chunks/a.js`, `manifest.webmanifest`, `icon.svg` e um `sw.js` antigo: a lista contém 100% desses arquivos exceto `sw.js`, mais `/`, com `/` como separador; a versão é igual em duas execuções e muda quando um conteúdo muda; o resultado não contém nenhum dos dois marcadores, compila com `new vm.Script(resultado)` e não contém anotações de tipo; marcador ausente ou duplicado → erro; `out/` inexistente → erro
- [ ] T024 Escrever `tests/unit/app/sw-register.test.tsx`: `registerServiceWorker` com `register` simulado e `enabled = true` → chamado uma vez com `'/sw.js'` e `{ scope: '/' }`, retorna `true`; `enabled = false` ou `container` indefinido → não chama e retorna `false`; `register` que rejeita → retorna `false` sem lançar; renderizar `<ServiceWorkerRegister />` não lança no `jsdom`

**Checkpoint**: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` (incluindo
`out/sw.js`) já funcionam individualmente; as user stories podem começar.

---

## Phase 3: User Story 1 - Verificação completa com um único comando (Priority: P1) 🎯 MVP

**Goal**: `npm run verify` executa tipos → padrões → testes com cobertura → build, para na primeira
falha e identifica a etapa (FR-001 a FR-005).

**Independent Test**: no esqueleto, `npm run verify; $LASTEXITCODE` → `VERIFY OK: 4/4 etapas` e
`0`; injetar, uma de cada vez, as falhas 2a–2d do [quickstart.md](quickstart.md) e observar
`VERIFY FALHOU: etapa=<nome> (código <n>)`.

### Tests for User Story 1

- [ ] T025 [P] [US1] Criar fixtures em `tests/fixtures/complexity/`: `cyclomatic-10.ts` (função `cyclomatic10` com exatamente 9 pontos de decisão → ciclomática 10, cognitiva ≤ 15), `cyclomatic-11.ts` (`cyclomatic11`, 10 pontos de decisão → 11, cognitiva ≤ 15), `cognitive-15.ts` (`cognitive15`, cognitiva exatamente 15 com ciclomática ≤ 10, usando aninhamento) e `cognitive-16.ts` (`cognitive16`, cognitiva exatamente 16 com ciclomática ≤ 10); usar **somente** `if`, `for`, `while`, `&&` e `||`, que o ESLint `complexity` e o SonarQube S1541 contam igual — proibidos `??`, `?.`, parâmetros com valor padrão, `switch`/`case`, `catch`, ternário e `&&=`/`||=`/`??=` (R6); comentar em cada arquivo a conta dos incrementos
- [ ] T026 [P] [US1] Escrever `tests/unit/scripts/complexity-rules.test.ts` (SC-003, R6): `new ESLint({ overrideConfigFile: 'eslint.config.mjs', ignore: false })`, lintar cada fixture de T025 e afirmar: `cyclomatic-11` tem mensagem da regra `complexity` com linha e coluna, citando `cyclomatic11` (a regra fornece o nome); `cognitive-16` tem mensagem de `sonarjs/cognitive-complexity` com linha e coluna da função `cognitive16` (a regra não fornece o nome — FR-003); `cyclomatic-10` e `cognitive-15` não têm nenhuma das duas regras (4/4 casos)
- [ ] T027 [P] [US1] Escrever `tests/unit/scripts/verify.test.ts` (SC-002): com `exec` simulado, `runStages` executa as 4 etapas na ordem `tipos`, `padroes`, `testes`, `build` e retorna 0 quando todas passam; para cada etapa i (4 casos), falha em i → código de saída i (1–4), etapas após i não executadas, saída de erro contém `VERIFY FALHOU: etapa=<nome> (código <i>)`; falha no segundo comando de uma etapa (ex.: `generate-sw.ts` em `build`) também falha a etapa; sucesso imprime `VERIFY OK: 4/4 etapas`; cada etapa imprime `VERIFY ▶ etapa=<nome>` antes de rodar
- [ ] T028 [P] [US1] Escrever `tests/unit/app/page.test.tsx`: renderiza `src/app/page.tsx` com `@testing-library/react` e verifica o título "Em construção" (`getByRole('heading', { level: 1 })`)

### Implementation for User Story 1

- [ ] T029 [US1] Implementar `scripts/verify/stages.ts`: tipo `Stage = { name: 'tipos' | 'padroes' | 'testes' | 'build'; code: 1 | 2 | 3 | 4; commands: Array<{ cmd: string; args: string[] }> }`; constante `STAGES` com os comandos exatos de [contracts/cli.md](contracts/cli.md) (`tipos`: `npx tsc --noEmit -p tsconfig.json`, `npx tsc --noEmit -p scripts/tsconfig.json` e `npx tsc --noEmit -p src/pwa/tsconfig.json`; `padroes`: `npx eslint . --max-warnings=0` e `npx prettier --check .`; `testes`: `npx vitest run --coverage`; `build`: `npx next build` e `node scripts/pwa/generate-sw.ts`); função pura `runStages(stages, exec, log)` que imprime `VERIFY ▶ etapa=<nome>`, executa os comandos da etapa em sequência, na primeira falha escreve `VERIFY FALHOU: etapa=<nome> (código <n>)` em stderr e retorna `n`; ao final retorna 0 com `VERIFY OK: 4/4 etapas`; a saída das ferramentas é herdada sem filtro (depende de T014)
- [ ] T030 [US1] Implementar `scripts/verify/verify.ts`: chama `runStages(STAGES, run, console)` e `process.exit(code)`; sem interação (FR-005)
- [ ] T031 [US1] Executar `npm run verify` e corrigir até `VERIFY OK: 4/4 etapas` com código 0, `coverage/index.html`, `coverage/lcov.info`, `out/index.html`, `out/manifest.webmanifest` e `out/sw.js` gerados (quickstart Cenário 1)
- [ ] T032 [US1] Executar o checklist de injeção real 2a–2d do [quickstart.md](quickstart.md) (tipo em `src/app/page.tsx`; copiar `tests/fixtures/complexity/cyclomatic-11.ts` para `src/lib/`; `expect(1).toBe(2)` em `tests/unit/app/page.test.tsx`; `export const dynamic = 'force-dynamic'` em `src/app/page.tsx`), confirmar código 1/2/3/4 e a etapa na saída, desfazer cada injeção e confirmar `npm run verify` verde de novo

**Checkpoint**: US1 completa — portão de qualidade funcional (SC-001 parcial, SC-002, SC-003).

---

## Phase 4: User Story 2 - Análise de qualidade local com escopo correto (Priority: P2)

**Goal**: `npm run sonar -- --etapa <etapa>` analisa os projetos `app` e `scripts` no SonarQube
local, importa a cobertura, verifica o escopo e grava 2 linhas na tabela SonarQube (FR-006 a
FR-009, FR-014, FR-015, FR-017).

**Independent Test**: `npm run verify` seguido de `npm run sonar -- --etapa implement` → duas
análises, verificação de escopo OK, 2 linhas novas com `linha_base = sim`; com o servidor parado →
código 10 e arquivo de métricas com o mesmo hash (quickstart Cenário 4).

### Tests for User Story 2

- [ ] T033 [P] [US2] Escrever `tests/unit/scripts/sonar-scope.test.ts` (SC-004, lógica, comparação por segmento conforme [contracts/sonar-scopes.md](contracts/sonar-scopes.md)): `checkScopes(appFiles, scriptsFiles)` passa com arquivos `src/...` e `scripts/...`, inclusive `src/checkout/x.ts`, `src/app/layout.tsx` e `scripts/about/y.ts` (sem falso positivo de substring); falha e lista os arquivos ofensores quando: arquivo do app fora de `src/`; arquivo de scripts fora de `scripts/`; algum segmento do caminho é `node_modules`, `tests`, `.next`, `out`, `coverage`, `.scannerwork`, `specs`, `.specify` ou `docs` (ex.: `src/out/x.ts`); nome de arquivo com `.test.` ou `.spec.`; caminho com `\` normalizado antes da checagem; interseção das listas não vazia; alguma lista vazia
- [ ] T034 [P] [US2] Escrever `tests/unit/scripts/sonar-analyze.test.ts` com `fetch`, `exec` e `fs` simulados: servidor indisponível → código 10, mensagem `SONAR FALHOU: servidor indisponível em <url>`, `appendRows` não chamado; `SONAR_TOKEN` ausente → código 10 com `SONAR FALHOU: SONAR_TOKEN não definido`; sem `coverage/lcov.info` → código 11; scanner falha no escopo `scripts` depois de `app` concluir → código 12 e nada gravado; verificação de escopo falha → código 13 e nada gravado; Quality Gate `ERROR` → linhas gravadas com `quality_gate = ERROR`; primeira execução → `linha_base = sim` nos dois escopos, segunda → `não`; `--etapa correcao-1` sem linha de base do escopo → recusado e nada gravado; nenhuma saída capturada contém o valor do token
- [ ] T035 [P] [US2] Escrever `tests/unit/scripts/secrets.test.ts` (SC-008, R15): percorre `git ls-files` (via `child_process.execFileSync`) mais `specs/*/metricas-ia.md` e afirma que nenhum arquivo contém o padrão `sq[apu]_[0-9a-f]{40}` nem, quando `process.env.SONAR_TOKEN` está definido, o valor exato do token; afirma também que `.gitignore` contém `.env*` e `.scannerwork/`
- [ ] T036 [P] [US2] Escrever `tests/unit/scripts/max-complexity.test.ts` (FR-014, R9): `maxComplexity(files)` sobre as quatro fixtures de T025 → `{ ciclomaticaMax: 11, cognitivaMax: 16 }`; só sobre `cyclomatic-10.ts` e `cognitive-15.ts` → ciclomática 10 e cognitiva 15; arquivo sem funções → `{ 0, 0 }`; lista vazia → `{ 0, 0 }`; os valores vêm do número na mensagem de cada regra, não de contagem de mensagens

### Implementation for User Story 2

- [ ] T037 [P] [US2] Criar `docker-compose.yml` com o serviço `sonarqube` (imagem `sonarqube:community`, porta `9000:9000`, banco H2 embutido, `SONAR_TELEMETRY_ENABLE=false`, volumes nomeados `sonarqube_data`, `sonarqube_extensions`, `sonarqube_logs`) (R7)
- [ ] T038 [P] [US2] Criar `sonar-project.app.properties` (`sonar.projectKey=tcc-controle-parental-app`, `sonar.projectName=TCC Controle Parental — app`, `sonar.sources=src`) e `sonar-project.scripts.properties` (`sonar.projectKey=tcc-controle-parental-scripts`, `sonar.projectName=TCC Controle Parental — scripts`, `sonar.sources=scripts`), ambos com as propriedades comuns exatas de [contracts/sonar-scopes.md](contracts/sonar-scopes.md): `sonar.sourceEncoding=UTF-8`, `sonar.javascript.lcov.reportPaths=coverage/lcov.info`, `sonar.exclusions=**/node_modules/**,**/*.test.*,**/*.spec.*,tests/**,.next/**,out/**,coverage/**,.scannerwork/**,specs/**,.specify/**,docs/**,**/*.d.ts`, `sonar.qualitygate.wait=true`, `sonar.qualitygate.timeout=300`; **sem** `sonar.host.url` e sem `sonar.token`
- [ ] T039 [P] [US2] Implementar `scripts/sonar/api.ts`: cliente da Web API com `fetch` injetável, base `SONAR_HOST_URL` (padrão `http://localhost:9000`), autenticação `Authorization: Bearer <SONAR_TOKEN>`; funções `systemStatus()`, `measures(key, metricKeys)` (`api/measures/component`), `gateStatus(key)` (`api/qualitygates/project_status`), `ceTask(id)` (`api/ce/task`, retorna `analysisId` e `executedAt`), `listFiles(key)` (`api/measures/component_tree?component=<key>&qualifiers=FIL&ps=500`, paginando até o total), e as chamadas de administração usadas por T041; erros HTTP viram exceção sem incluir cabeçalhos nem token na mensagem
- [ ] T040 [US2] Implementar `scripts/sonar/up.ts`: `docker compose up -d sonarqube` via `run`; depois consulta `api/system/status` a cada 5 s até `UP` (máximo 5 min); código ≠ 0 com mensagem em pt-BR se o Docker não estiver disponível ou o tempo esgotar (contracts/cli.md)
- [ ] T041 [US2] Implementar `scripts/sonar/setup.ts` (idempotente, R8): exige `SONAR_TOKEN` de administrador; cria/atualiza o perfil `TCC TypeScript` herdando de "Sonar way" (linguagem `ts`) com S3776 `threshold=15` e S1541 `threshold=10`, ambas severidade Critical; cria/atualiza o Quality Gate `TCC` com as condições em *Overall Code*: `bugs` > 0, `vulnerabilities` > 0, `security_hotspots_reviewed` < 100, `duplicated_lines_density` > 3, `sqale_rating` > 1, `blocker_violations` > 0, `critical_violations` > 0; cria os projetos `tcc-controle-parental-app` e `tcc-controle-parental-scripts` se não existirem e associa perfil e gate aos dois; segunda execução não duplica nada
- [ ] T042 [P] [US2] Implementar `scripts/sonar/scope.ts`: `checkScopes(appFiles, scriptsFiles)` com as regras de [contracts/sonar-scopes.md](contracts/sonar-scopes.md) (normalizar `\` para `/`; prefixos `src/` e `scripts/`; comparação por **segmento inteiro** do caminho contra `node_modules`, `tests`, `.next`, `out`, `coverage`, `.scannerwork`, `specs`, `.specify`, `docs`; nome de arquivo com `.test.`/`.spec.`; interseção vazia; ≥ 1 arquivo em cada lista), retornando `{ ok: boolean; offenders: string[] }`
- [ ] T043 [P] [US2] Implementar `scripts/sonar/max-complexity.ts` (R9, FR-014): `maxComplexity(files, eslintFactory?)` usando a API Node do ESLint (`ignore: false`) com `overrideConfig` que ativa `complexity: ['error', 0]` e `sonarjs/cognitive-complexity: ['error', 0]` sobre a lista de arquivos recebida (o ponto de chamada em T044 passa `src/**/*.{ts,tsx}` ou `scripts/**/*.ts`), extrai o valor numérico de cada mensagem e retorna `{ ciclomaticaMax, cognitivaMax }` (0 se nenhuma função)
- [ ] T044 [US2] Implementar `scripts/sonar/analyze.ts` seguindo os passos 1–5 de [contracts/cli.md](contracts/cli.md): (1) `SONAR_TOKEN` definido e `systemStatus() === 'UP'`, senão código 10; (2) `coverage/lcov.info` existe, senão código 11; (3) para `app` e depois `scripts`, roda `npx sonar -Dproject.settings=sonar-project.<escopo>.properties -Dsonar.host.url=<url>` (token só pelo ambiente), lê `ceTaskId` de `.scannerwork/report-task.txt` logo após cada execução; falha do scanner → código 12 (gate `ERROR` não é falha); (4) `listFiles` dos dois projetos + `checkScopes`, falha → código 13 listando os arquivos; (5) lê `measures` com `bugs, vulnerabilities, code_smells, duplicated_lines_density, complexity, cognitive_complexity, sqale_index, sqale_rating, coverage`, `gateStatus`, `ceTask`, calcula os máximos (T043) e monta as 2 linhas com as colunas do data-model (`data_hora` = `executedAt` em ISO 8601 UTC; `manutenibilidade` 1→A … 5→E; `linha_base` = `sim` se não há linha anterior do mesmo escopo); recusa `--etapa correcao-N` se não houver linha de base do escopo; grava as 2 linhas com uma única chamada `appendRows(..., 'sonar', [app, scripts])` e imprime as linhas e a situação dos dois gates; em qualquer falha nada é gravado
- [ ] T045 [US2] Subir o servidor (`npm run sonar:up`); pedir à pesquisadora o passo manual do quickstart Setup (trocar a senha do admin, gerar o token de administrador na interface e defini-lo em `SONAR_TOKEN`); rodar `npm run sonar:setup` duas vezes (idempotência) e validar no servidor o perfil, o gate e os dois projetos; **não** rodar `npm run sonar -- --etapa implement` ainda (a linha de base é gravada em T063)

**Checkpoint**: US2 completa — análise local com dois escopos isolados, pronta para a linha de base.

---

## Phase 5: User Story 3 - Registro auditável de métricas de IA e de qualidade (Priority: P3)

**Goal**: `npm run metrics:ia` grava linhas de IA com valores lidos do ccusage e das transcrições;
`metrics:check` confere 100% das linhas; `metrics:consolidar` gera o consolidado (FR-010 a FR-013,
FR-016, FR-018, FR-020).

**Independent Test**: dentro de implement, os testes automatizados (SC-005, SC-006) e as execuções
sem gravação de T058/T059; o registro real de duas sessões seguidas, com linhas anteriores
idênticas e `npm run metrics:check` com código 0, acontece na sessão de registro de T064
(quickstart Cenários 5–7).

### Tests for User Story 3

- [ ] T046 [P] [US3] Criar fixtures `tests/fixtures/ccusage/session-ok.json` (saída de `ccusage@20.0.46 session --json --offline --id <id>` com `period`, `inputTokens`, `outputTokens`, `cacheCreationTokens`, `cacheReadTokens`, `totalCost` com muitas casas decimais, `modelsUsed` com 2 modelos e `metadata.lastActivity`) e `tests/fixtures/ccusage/session-empty.json` (zero sessões); copiar a forma de uma saída real do `npx -y ccusage@20.0.46 session --json --offline` desta máquina, trocando os valores
- [ ] T047 [P] [US3] Criar `tests/fixtures/transcripts/session-a.jsonl` com: 3 prompts reais do usuário (um deles invocação `/speckit-plan` com argumentos), 2 entradas `tool_result`, 1 entrada `isMeta: true`, 1 com `<local-command-stdout>`, 1 com `<local-command-caveat>`, 1 mensagem sintética de compactação e mensagens `assistant` — contagem esperada = 3 (R12)
- [ ] T048 [P] [US3] Escrever `tests/unit/scripts/ccusage.test.ts`: `parseSessions` lê a fixture e soma `inputTokens`, `outputTokens`, `cacheCreationTokens`, `cacheReadTokens` e `totalCost` de várias sessões sem arredondar (string de custo preserva todos os dígitos do JSON); `modelo` = união de `modelsUsed` com IDs exatos unidos por `+`; `data_hora` = `lastActivity` mais recente; zero sessões ou ID ausente → erro `CcusageError`; o comando montado é exatamente `npx -y ccusage@20.0.46 session --json --offline --id <id>`
- [ ] T049 [P] [US3] Escrever `tests/unit/scripts/transcript.test.ts`: `countPrompts` sobre `session-a.jsonl` → 3; `listPrompts` retorna os 3 textos na ordem; `transcriptDir(cwd, home)` deriva o slug trocando cada caractere fora de `[A-Za-z0-9]` por `-` e encontra o diretório sem diferenciar maiúsculas (ex.: `c--Projeto-TCC-final-my-project`); `activeSessionId` retorna o `.jsonl` modificado mais recentemente
- [ ] T050 [P] [US3] Escrever `tests/unit/scripts/record-ia.test.ts` com ccusage, transcrições e fs simulados: ccusage indisponível ou sessão inexistente → código 22 e arquivo inalterado (FR-012, US3-3); sessão ativa → código 21; sessão já registrada em outra linha da feature → código 21; sem `--correcoes` → código 20, prompts listados, nada gravado; `--etapa correcao-1 --correcoes 0` → recusado; `--etapa registro --correcoes 1` → recusado; `--etapa registro+plan` → recusado; `--etapa plan+tasks` sem `--retroativo` e sem `--obs` → recusado e nada gravado; `--etapa plan+tasks --obs "desvio: sessão com duas etapas"` → aceito; `--etapa constitution+specify --retroativo` sem `--obs` → aceito; `--obs` com "`|`" → recusado; caso válido → 1 linha com as 14 colunas na ordem do contrato, `versao_ccusage = 20.0.46`, `sessoes` com os IDs separados por `,`, `tipo` = `no momento` ou `retroativo` (com `--retroativo`); `--etapa registro --correcoes 0` → aceito; `--sessao id1,id2` → soma dos totais e os dois IDs
- [ ] T051 [P] [US3] Escrever `tests/unit/scripts/consolidate.test.ts` com dois arquivos `metricas-ia.md` de exemplo em diretório temporário (com linhas de etapas e linhas `registro`): soma por feature de tokens, custo, prompts e rodadas **sem** as linhas `registro`, e total geral; seção "Custo de medição — sessões de registro (fora da comparação)" com a soma das linhas `registro` por feature e total; última linha SonarQube de cada escopo de cada feature; seção "Escopo app — base da comparação com o braço de vibe coding" antes e separada de "Escopo scripts — dado complementar"; arquivo fora do formato (âncora ausente) → código 40 e consolidado não gravado
- [ ] T052 [P] [US3] Escrever `tests/unit/scripts/check-ia.test.ts` (SC-005) com ccusage e fs simulados e dois arquivos `metricas-ia.md` em diretório temporário: todas as linhas iguais ao ccusage (inclusive uma com `--sessao id1,id2` somada e uma linha `registro`) → código 0 e `METRICS CHECK OK: <n>/<n> linhas idênticas`; custo divergente só no último dígito → código 30, saída com feature, linha, coluna, esperado e obtido; token divergente → código 30; o comando do ccusage usa a versão da coluna `versao_ccusage` da linha e `--offline`; falha do ccusage numa linha → código 30 com o motivo; nenhum arquivo é alterado (mesmo hash)

### Implementation for User Story 3

- [ ] T053 [P] [US3] Implementar `scripts/metrics/ccusage.ts`: constante `CCUSAGE_VERSION = '20.0.46'`; `fetchSession(id, exec)` roda `npx -y ccusage@20.0.46 session --json --offline --id <id>` com `capture: true`; `parseSessions(json)` e `sumSessions(sessions)` conforme o data-model ("custo_usd: precisão completa do JSON, sem arredondar" — somar com aritmética decimal sobre as strings do JSON, não `number`; "modelo: ID exato, nunca abreviado"); erros de processo, JSON inválido, zero sessões ou ID não encontrado → `CcusageError`
- [ ] T054 [P] [US3] Implementar `scripts/metrics/transcript.ts` (R11, R12): `transcriptDir(cwd, home)` (`<home>/.claude/projects/<slug>`, slug sem diferenciar maiúsculas no Windows), `readTranscript(id)`, `listPrompts(lines)` / `countPrompts(lines)` contando só entradas `type: "user"` com texto digitado (excluir `tool_result`, `isMeta: true`, `<local-command-stdout>`, `<local-command-caveat>`, mensagens sintéticas de compactação; invocação `/speckit-*` = 1 prompt) e `activeSessionId(dir)` = `.jsonl` com maior `mtime`
- [ ] T055 [US3] Implementar `scripts/metrics/record-ia.ts` (`npm run metrics:ia`, contracts/cli.md): `parseArgs` → `resolveFeatureDir` → recusa sessão ativa ou já presente em `readRows(..., 'ia')` (código 21) → `fetchSession` de cada ID (falha → código 22) → `countPrompts` somando as transcrições ("prompts: inteiro ≥ 1") → sem `--correcoes` imprime os prompts numerados e sai com 20, pedindo o número de prompts de correção (FR-011c) → valida "rodadas_correcao: ≥ 1 quando etapa é correcao-N; = 0 quando etapa é registro", `etapa` conforme a entidade Etapa (`constitution`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, `correcao-N` com N ≥ 1, ou nomes unidos por `+`; `registro` só sozinho; etapa com `+` sem `--retroativo` exige `--obs` não vazio — desvio do edge case da spec) e "observacao: sem `|` nem quebra de linha" → monta a linha nas 14 colunas do contrato (`data_hora` em ISO 8601 UTC) → `appendRows(..., 'ia', [linha])` → imprime a linha gravada (depende de T017, T053, T054)
- [ ] T056 [US3] Implementar `scripts/metrics/check-ia.ts` (`npm run metrics:check`, SC-005): para cada `specs/*/metricas-ia.md`, cada linha de IA (inclusive `registro`): consulta o ccusage na versão da coluna `versao_ccusage` com `--offline` para os IDs de `sessoes`, soma e compara `tokens_entrada`, `tokens_saida`, `tokens_cache_escrita`, `tokens_cache_leitura` e `custo_usd` como strings exatas; imprime `METRICS CHECK OK: <n>/<n> linhas idênticas` e sai 0, ou lista feature/linha/coluna/esperado/obtido e sai 30 (falha do ccusage numa linha conta como divergência)
- [ ] T057 [US3] Implementar `scripts/metrics/consolidate.ts` (`npm run metrics:consolidar`, FR-018, R17): lê todos os `specs/*/metricas-ia.md` com `readRows`, regenera inteiro `docs/metricas/consolidado.md` com aviso "gerado por `npm run metrics:consolidar`; não editar à mão", tabela de IA por feature + total geral **sem** as linhas `registro`, seção "Custo de medição — sessões de registro (fora da comparação)" com a soma das linhas `registro` por feature e total, seção "Escopo app — base da comparação com o braço de vibe coding" com a última linha SonarQube do escopo app de cada feature e seção "Escopo scripts — dado complementar"; arquivo fora do formato → código 40 sem gravar; grava via `.tmp` + `rename`
- [ ] T058 [US3] Validar a leitura de dados reais **sem gravar nada** (o registro em si é feito em T064, numa sessão de registro — FR-011a, FR-020): rodar `npx -y ccusage@20.0.46 session --json --offline` e, para uma sessão histórica (ex.: a de plan), `npm run metrics:ia -- --etapa plan --sessao <id> --retroativo` **sem** `--correcoes` → código 20 com os prompts numerados; conferir que `specs/001-quality-metrics-infra/metricas-ia.md` não foi criado nem alterado
- [ ] T059 [US3] Conferir as falhas controladas do Cenário 5, sem gravar nada: `--sessao 00000000-0000-0000-0000-000000000000` → 22; sessão atual (implement) → 21; arquivo de métricas inexistente ou com o mesmo hash em ambos; `npm run metrics:check` e `npm run metrics:consolidar` reais rodam em T064

**Checkpoint**: US3 implementada e validada sem gravação; o registro retroativo, o de implement e o
consolidado são gravados em T064, numa sessão de registro.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: fechar os critérios de conclusão do [quickstart.md](quickstart.md), validar
privacidade e funcionamento offline e gravar a linha de base SonarQube antes de qualquer correção
(SC-007).

- [ ] T060 Executar `npm run verify` completo e confirmar `VERIFY OK: 4/4 etapas` (SC-001) com todos os testes de T018, T023, T024, T026–T028, T033–T036 e T048–T052 passando
- [ ] T061 Executar o quickstart Cenário 9 (privacidade): servir `out/` localmente (`npx serve out`), abrir no navegador com DevTools › Network e confirmar nenhuma requisição fora de `localhost`, inclusive as do service worker; confirmar a CSP no `<head>` de `out/index.html`
- [ ] T062 Executar o quickstart Cenário 10 (offline — FR-021, SC-009): passos 10a–10e (SW ativo, manifest sem erros, um único cache `tcc-<versão>` com a lista de `out/sw.js`, recarga com o servidor parado abre do cache, nova versão substitui o cache anterior); desfazer a alteração do passo 10e e rodar `npm run verify` verde de novo
- [ ] T063 Gravar a linha de base SonarQube: `npm run verify` seguido de `npm run sonar -- --etapa implement`; confirmar 2 linhas novas em `specs/001-quality-metrics-infra/metricas-ia.md` com `linha_base = sim` (app e scripts) — **nenhuma alteração de código motivada pela análise antes desta gravação** (FR-017, SC-007); depois, com `docker compose stop sonarqube`, confirmar código 10 e hash inalterado (`Get-FileHash`), e religar o servidor. A sessão de implement termina aqui
- [ ] T064 Na primeira sessão de registro (FR-011b) aberta depois do fim de implement, antes de qualquer etapa `correcao-N`: (1) registro retroativo (FR-020, R18, quickstart Cenário 6) — identificar pelas transcrições em `%USERPROFILE%\.claude\projects\c--Projeto-TCC-final-my-project\` as sessões de constitution, specify, clarify, plan, tasks e analyze (commits `a3ad42e`, `26c7dbc`, `426d897`, `f1938d9` e `8398d4b` ajudam a datar), classificar os prompts de correção pelos prompts listados (código 20) e rodar `npm run metrics:ia -- --etapa <etapa(s)> --sessao <id> --retroativo --correcoes <n>` para cada sessão; sessão com várias etapas → uma linha com as etapas unidas por `+`, sem dividir valores; etapa em várias sessões → `--sessao id1,id2,…`; a etapa analyze reúne **todas** as sessões de análise e **todas** as sessões de correção dos apontamentos, em ordem cronológica (`--etapa analyze --sessao <id1>,<id2>,…`, com os prompts que pedem as correções contados em `--correcoes`); (2) registrar implement (`npm run metrics:ia -- --etapa implement --sessao <id> --correcoes <n>`, sem `--retroativo`); (3) `npm run metrics:check` (código 0, 100% idêntico — SC-005) e `npm run metrics:consolidar`, criando `docs/metricas/consolidado.md`; não registrar a sessão ativa
- [ ] T065 Se algum Quality Gate da linha de base estiver `ERROR`, ou outro portão do FR-011c estiver reprovado, tratar cada correção como etapa `correcao-N` em sessão própria (FR-011a, FR-011c): numa sessão nova, corrigir, `npm run verify`, `npm run sonar -- --etapa correcao-N` e encerrar; depois, numa sessão de registro, `npm run metrics:ia -- --etapa correcao-N --sessao <id> --correcoes <n≥1>`, registrar a sessão de registro anterior com `--etapa registro --correcoes 0`, `npm run metrics:check` (0) e `npm run metrics:consolidar`; repetir até `OK` nos dois escopos. Ao final, conferir o critério de conclusão do [quickstart.md](quickstart.md): Cenários 1–10 aprovados, gate `TCC` `OK` nos dois escopos, `metricas-ia.md` com linhas de IA de todas as etapas e snapshot SonarQube (a última sessão de registro é registrada pela primeira sessão de registro posterior, no arquivo desta feature)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T003 depende de T001; T004–T008 podem rodar em paralelo
  após T001.
- **Foundational (Phase 2)**: depende do Setup; BLOQUEIA todas as user stories. T017 depende de
  T015/T016 apenas para tipos comuns; T018 depende de T017. T012 depende de T021 (componente de
  registro); T022 depende de T020 (lê `src/pwa/sw.ts`); T023 depende de T022; T024 depende de
  T021.
- **US1 (Phase 3)**: depende da Foundational (usa T009, T010, T012–T014, T022).
- **US2 (Phase 4)**: depende da Foundational (usa T014, T017); independente de US1 no código, mas
  `npm run sonar` exige o `coverage/lcov.info` gerado pelo `npm run verify` de US1 para a execução
  real (T045 não executa a análise; os testes de T034 usam fs simulado). T036 usa as fixtures de
  T025.
- **US3 (Phase 5)**: depende da Foundational (usa T014–T017); independente de US1 e US2 no código.
  O consolidado lê a tabela SonarQube, mas funciona com ela vazia.
- **Polish (Phase 6)**: depende de US1, US2 e US3. T061 e T062 precedem T063 (privacidade e
  offline validados antes da linha de base); T063 encerra a sessão de implement; T064 (primeira
  sessão de registro: retroativos, implement, check e consolidado) precede T065 (etapas
  `correcao-N`, sempre depois da linha de base); T065 é a última tarefa.

### User Story Dependencies

- **US1 (P1)**: após Foundational; nenhuma dependência de outras stories.
- **US2 (P2)**: após Foundational; usa o relatório de cobertura de US1 apenas em execução real e
  as fixtures de complexidade de US1 no teste T036.
- **US3 (P3)**: após Foundational; a linha SonarQube vem de US2, mas US3 é testável sozinha.

### Within Each User Story

- Testes e fixtures primeiro, falhando antes da implementação.
- Bibliotecas (`api.ts`, `scope.ts`, `max-complexity.ts`, `ccusage.ts`, `transcript.ts`) antes dos
  pontos de entrada (`analyze.ts`, `record-ia.ts`, `check-ia.ts`).
- Tarefas de execução/validação (T031, T032, T045, T058, T059) por último na story.

### Parallel Opportunities

- Setup: T002, T004, T005, T006, T007, T008.
- Foundational: T010, T011, T013, T014, T015, T016, T019, T020, T021 (T009 também é arquivo
  próprio, mas outros dependem dele para o lint passar); depois T012, T022 → T023, T024.
- US1: T025, T026, T027, T028 juntos; depois T029 → T030.
- US2: T033, T034, T035, T037, T038, T039, T042, T043 juntos (T036 após T025); depois T040, T041,
  T044.
- US3: T046–T054 juntos; depois T055, T056, T057 (T056 e T057 podem rodar em paralelo após T055).
- Com Foundational pronta, US1, US2 e US3 podem ser desenvolvidas em paralelo.

---

## Parallel Example: User Story 1

```text
Task: "T025 Criar fixtures de complexidade em tests/fixtures/complexity/"
Task: "T026 Escrever tests/unit/scripts/complexity-rules.test.ts"
Task: "T027 Escrever tests/unit/scripts/verify.test.ts"
Task: "T028 Escrever tests/unit/app/page.test.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T037 Criar docker-compose.yml"
Task: "T038 Criar sonar-project.app.properties e sonar-project.scripts.properties"
Task: "T039 Implementar scripts/sonar/api.ts"
Task: "T042 Implementar scripts/sonar/scope.ts"
Task: "T043 Implementar scripts/sonar/max-complexity.ts"
```

## Parallel Example: User Story 3

```text
Task: "T053 Implementar scripts/metrics/ccusage.ts"
Task: "T054 Implementar scripts/metrics/transcript.ts"
Task: "T048 Escrever tests/unit/scripts/ccusage.test.ts"
Task: "T049 Escrever tests/unit/scripts/transcript.test.ts"
Task: "T052 Escrever tests/unit/scripts/check-ia.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup.
2. Phase 2: Foundational (bloqueia tudo).
3. Phase 3: US1 → `npm run verify` verde e falhando corretamente em cada etapa.
4. **PARAR E VALIDAR**: quickstart Cenários 1–3.

### Incremental Delivery

1. Setup + Foundational → base pronta, com esqueleto offline.
2. US1 → portão de qualidade (MVP).
3. US2 → análise SonarQube com escopos isolados (sem gravar a linha de base ainda).
4. US3 → ferramentas de registro de IA e consolidado, validadas sem gravar.
5. Polish → privacidade, offline, linha de base SonarQube (antes de qualquer correção); depois de
   implement, sessão de registro com retroativos, implement e consolidado; correções e critério
   de conclusão.

### Observações do estudo

- A sessão de implement termina depois de T063. Correções motivadas pela análise de T063
  acontecem em etapas `correcao-N`, em sessões próprias (T065), nunca na sessão de implement.
- Nenhuma linha de IA é gravada dentro de implement, nem as retroativas: todas são gravadas em
  sessões de registro (T064, T065), sem exceção à R11.
  Prompts de correção feitos durante implement (ex.: T031) são contados em `--correcoes` da linha
  de implement (FR-011c).
- A linha de IA de uma sessão é sempre gravada depois que ela termina, numa sessão de registro
  (R11, FR-011b); nunca registrar a sessão ativa. O custo das sessões de registro fica na seção de
  custo de medição do consolidado.

---

## Notes

- [P] = arquivos diferentes, sem dependências pendentes.
- [Story] liga a tarefa à user story para rastreabilidade.
- Commit após cada tarefa ou grupo lógico.
- Evitar: tarefas vagas, conflito no mesmo arquivo, dependências entre stories que quebrem a
  independência.
