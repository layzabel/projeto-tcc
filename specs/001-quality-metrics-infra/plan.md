# Implementation Plan: Infraestrutura de Qualidade e Métricas

**Branch**: `001-quality-metrics-infra` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-quality-metrics-infra/spec.md`

## Summary

Criar a base de qualidade e medição do projeto antes de qualquer funcionalidade do controle
parental: um esqueleto mínimo Next.js (App Router, exportação estática, TypeScript strict) e uma
camada de scripts TypeScript executados nativamente pelo Node.js 24 que oferece (1) o comando único
`npm run verify` (tipos → padrões com limites de complexidade 10/15 → testes Vitest com cobertura →
`next build`), parando e identificando a etapa que falhou; (2) a análise no SonarQube Community
local (Docker) em dois projetos separados, `app` e `scripts`, com cobertura importada, verificação
automática de escopo e Quality Gate do Princípio V; (3) o registro somente-acréscimo e atômico de
métricas em `specs/<feature>/metricas-ia.md`, com tokens e custo lidos do ccusage fixado
(`20.0.46 --offline`) por ID de sessão, prompts contados nas transcrições, métricas SonarQube lidas
da Web API, e o consolidado `docs/metricas/consolidado.md`, com o custo das sessões de registro em
seção própria; (4) o funcionamento offline do esqueleto (Princípio II): manifest gerado pelo Next
(`src/app/manifest.ts`) e service worker escrito em TypeScript (`src/pwa/sw.ts`), convertido em
`out/sw.js` depois do `next build` com a lista de cache de todos os arquivos da versão gerada.
Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`) em Node.js 24 LTS (`engines: ">=24 <25"`,
`.nvmrc` = `24`); scripts `.ts` executados via *type stripping* nativo do Node 24. O service
worker é convertido para JavaScript com `stripTypeScriptTypes` de `node:module` (sem dependência
nova).

**Primary Dependencies**: `next` 16.x, `react`/`react-dom` 19.x. Dev: `typescript`,
`@types/node`, `@types/react`, `@types/react-dom`, `eslint` 9, `eslint-config-next`,
`eslint-plugin-sonarjs`, `eslint-config-prettier`, `prettier`, `vitest`, `@vitest/coverage-v8`,
`@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`,
`@sonar/scan`. Externos (não são dependências do pacote): `ccusage@20.0.46` via `npx`, imagem
Docker `sonarqube:community`.

**Storage**: N/A para o app (sem backend e sem banco). Infraestrutura: arquivos Markdown
versionados (`specs/<feature>/metricas-ia.md`, `docs/metricas/consolidado.md`).

**Testing**: Vitest (unitários de app em `jsdom` e de scripts em `node`), cobertura V8 em `text`,
`html` e `lcov`; regras de complexidade testadas pela API Node do ESLint sobre fixtures. E2E
(Playwright) adiado para a primeira feature com fluxo do responsável.

**Target Platform**: Desenvolvimento e execução da infraestrutura no Windows 11 (PowerShell e Git
Bash); app publicado como site estático (`out/`) para navegadores modernos.

**Project Type**: Aplicação web estática (frontend único) + scripts de automação de
desenvolvimento.

**Performance Goals**: N/A. Não há metas de desempenho nesta feature, nem do app nem dos
comandos de verificação e análise.

**Constraints**: execução 100% não interativa pelo agente; nenhum segredo em arquivo versionado ou
em saída registrada; gravação de métricas somente-acréscimo e atômica; valores de tokens/custo
nunca estimados; app sem nenhuma requisição de rede em tempo de execução.

**Scale/Scope**: esqueleto de 1 página com manifest e service worker; ~16 módulos de scripts; 2
projetos SonarQube; 1 arquivo de métricas por feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / Restrição | Situação | Evidência no plano |
|---|---|---|
| I. Proteção e Privacidade da Criança | ✅ N/A | Nenhum dado de criança é coletado ou tratado; sem telas de controle parental (FR-019). |
| II. Dados Exclusivamente no Aparelho | ✅ | `output: 'export'`; sem Route Handlers/Server Actions; CSP `connect-src 'self'` via `<meta>`; sem `next/font/google`, CDN ou telemetria; nenhuma dependência de runtime faz rede (R16). Offline após o primeiro carregamento: manifest + service worker que guarda a versão gerada em cache e só atende requisições da própria origem (FR-021, R19; quickstart Cenário 10). |
| III. Limite Diário SBP | ✅ N/A | Nenhuma lógica de tempo nesta feature. |
| IV. Interface Infantil | ✅ N/A | Sem área infantil; a página placeholder não tem alvos de toque nem padrões de engajamento. |
| V. Qualidade Mensurável | ✅ | SonarQube Community local, Quality Gate `TCC` com todos os mínimos (R8, [contracts/sonar-scopes.md](contracts/sonar-scopes.md)); limites 10/15 no ESLint e no Sonar; `strict: true`; `no-explicit-any` como erro; ESLint + Prettier no `verify`; todas as métricas exigidas registradas (R9). Arquivos de configuração da raiz e testes (`tests/**`, `*.test.*`, `*.spec.*`) fora dos dois escopos, com justificativa no Complexity Tracking. |
| VI. Rastreabilidade com IA | ✅ | `metricas-ia.md` com todas as colunas exigidas; fonte verificável (ccusage lê as transcrições da sessão — fonte aceita pelo princípio); sem estimativas (FR-012); "rodada de correção" = prompt de correção, contado na etapa em que ocorre (FR-011c); snapshot SonarQube ao fim de `implement` e de cada etapa `correcao-N`; custo das sessões de registro à parte (FR-011b); consolidado em `docs/metricas/consolidado.md` (R10–R18). |
| Stack (Next.js App Router estático, React, TS strict, Node 24 via `engines` + `.nvmrc`) | ✅ | Technical Context. |
| Dependências justificadas, sem rede/telemetria/anúncios | ✅ | Tabela "Justificativa de dependências" abaixo; todas são de desenvolvimento, exceto `next`/`react`/`react-dom`. |
| Testes (unitários de domínio; E2E do fluxo do responsável) | ✅ (adiamento justificado) | Não há domínio nem fluxo do responsável ainda; unitários para scripts e esqueleto. E2E adiado — ver Complexity Tracking. |
| Verificação de privacidade antes da entrega | ✅ | Quickstart, Cenário 9 (DevTools › Network sobre `out/`, incluindo as requisições do service worker). |
| Idioma pt-BR | ✅ | Página, mensagens dos scripts e documentação em pt-BR. |
| Fluxo e portões (build, testes, Quality Gate, métricas) | ✅ | `verify` + `sonar` + `metricas-ia.md`; critério de conclusão no [quickstart.md](quickstart.md). |

**Resultado (pré-Phase 0)**: aprovado. Os princípios I, II e IV são cumpridos integralmente,
sem adiamento. O único adiamento (testes E2E, uma restrição técnica e não um princípio) e as
exclusões da análise SonarQube (arquivos de configuração da raiz e testes) estão justificados no
Complexity Tracking.

**Re-check pós-analyze (2026-11-01)**: aprovado. O suporte offline (FR-021) foi trazido para esta
feature, porque o Princípio II não admite exceção.

**Re-check contra a constituição v1.0.1 (2026-11-01)**: aprovado. A emenda (PATCH) define a etapa
`correcao-N`, exige o snapshot SonarQube ao fim de `implement` e de cada `correcao-N` (não a cada
prompt de correção) e admite linha agregada quando a fonte não separa etapas da mesma sessão,
sem rateio. O plano já cumpre os três pontos: etapa `correcao-N` em sessão própria (FR-011c, R13),
snapshot em T063 e nas etapas `correcao-N` (T065), e linha agregada com as etapas unidas por `+`
e valores não divididos (R18). A sessão da emenda é registrada como linha `constitution`
retroativa (FR-020).

**Re-check pós-Phase 1**: aprovado. O design (contratos e modelo de dados) não introduz servidor,
rede em tempo de execução nem coleta de dados. Ponto de atenção registrado: a complexidade máxima
por função vem do ESLint (mesma regra cognitiva do Sonar), porque o SonarQube não expõe essa
métrica (R9); a origem fica explícita no contrato do arquivo de métricas.

### Justificativa de dependências

| Dependência | Motivo | Rede/telemetria? |
|---|---|---|
| `next`, `react`, `react-dom` | stack da constituição | Não em runtime (export estático); telemetria do Next CLI desligada com `NEXT_TELEMETRY_DISABLED=1` nos scripts |
| `typescript`, `@types/*` | verificação de tipos | Não |
| `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier` | padrões de código | Não |
| `eslint-plugin-sonarjs` | complexidade cognitiva idêntica à S3776 do Sonar | Não |
| `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/*` | testes e cobertura | Não |
| `@sonar/scan` | scanner oficial; baixa o scanner/JRE **do servidor local** | Apenas `localhost` |
| `ccusage@20.0.46` (npx, não instalado) | fonte de tokens e custo | Download do pacote pelo npx; `--offline` evita busca de preços |
| `sonarqube:community` (Docker) | análise local | Telemetria do servidor desligada |

## Project Structure

### Documentation (this feature)

```text
specs/001-quality-metrics-infra/
├── plan.md              # Este arquivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 (guia de validação e checklist de aceitação)
├── contracts/
│   ├── cli.md                 # comandos npm, saídas e códigos de saída
│   ├── metricas-ia-format.md  # formato do arquivo de métricas
│   └── sonar-scopes.md        # projetos, exclusões, verificação de escopo, Quality Gate
├── metricas-ia.md       # criado pelo primeiro registro (implement)
├── checklists/
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/                               # escopo Sonar "app"
├── app/
│   ├── layout.tsx                 # <html lang="pt-BR">, CSP via <meta>, registro do SW
│   ├── page.tsx                   # placeholder "Em construção"
│   ├── manifest.ts                # manifest da aplicação web (gera out/manifest.webmanifest)
│   ├── icon.svg                   # ícone local do manifest
│   ├── sw-register.tsx            # componente cliente que chama registerServiceWorker()
│   └── globals.css
└── pwa/
    ├── tsconfig.json              # lib webworker, só para sw.ts
    ├── sw.ts                      # service worker (cache da versão, só mesma origem)
    └── register.ts                # registerServiceWorker(container, enabled)

scripts/                           # escopo Sonar "scripts"
├── tsconfig.json
├── lib/
│   ├── exec.ts                    # execução de processos (Windows-safe), sem eco de segredos
│   ├── feature.ts                 # resolve specs/<feature>
│   └── args.ts                    # parsing de argumentos
├── verify/
│   ├── stages.ts                  # definição das 4 etapas + runStages()
│   └── verify.ts                  # entrada de `npm run verify`
├── pwa/
│   └── generate-sw.ts             # gera out/sw.js a partir de src/pwa/sw.ts e da lista de out/
├── metrics/
│   ├── ccusage.ts                 # chamada e parsing do JSON do ccusage
│   ├── transcript.ts              # contagem de prompts na transcrição .jsonl
│   ├── table.ts                   # leitura/inserção somente-acréscimo atômica
│   ├── record-ia.ts               # `npm run metrics:ia`
│   ├── check-ia.ts                # `npm run metrics:check`
│   └── consolidate.ts             # `npm run metrics:consolidar`
└── sonar/
    ├── api.ts                     # cliente da Web API (status, measures, gate, ce/task, tree)
    ├── up.ts                      # `npm run sonar:up`
    ├── setup.ts                   # `npm run sonar:setup`
    ├── scope.ts                   # verificação de escopo (SC-004)
    ├── max-complexity.ts          # máximos por função via ESLint
    └── analyze.ts                 # `npm run sonar`

tests/                             # fora dos dois escopos Sonar
├── unit/
│   ├── app/
│   │   ├── page.test.tsx
│   │   └── sw-register.test.tsx         # registro do SW
│   └── scripts/
│       ├── verify.test.ts               # SC-002
│       ├── complexity-rules.test.ts     # SC-003
│       ├── generate-sw.test.ts          # SC-009 (lista de cache completa)
│       ├── max-complexity.test.ts       # colunas *_max_funcao (FR-014)
│       ├── check-ia.test.ts             # SC-005 (verificador)
│       ├── ccusage.test.ts
│       ├── transcript.test.ts
│       ├── metrics-table.test.ts        # SC-006 + interrupção
│       ├── record-ia.test.ts            # sem dados → nada gravado
│       ├── sonar-scope.test.ts          # SC-004 (lógica)
│       ├── sonar-analyze.test.ts        # servidor indisponível → nada gravado
│       ├── consolidate.test.ts
│       └── secrets.test.ts              # SC-008
└── fixtures/
    ├── complexity/                # cyclomatic-10/11, cognitive-15/16
    ├── ccusage/                   # JSON de sessões de exemplo
    └── transcripts/               # .jsonl de exemplo

docs/metricas/consolidado.md
docker-compose.yml
sonar-project.app.properties
sonar-project.scripts.properties
eslint.config.mjs
prettier.config.mjs  .prettierignore
vitest.config.mts
next.config.ts
tsconfig.json
package.json  .nvmrc  .gitignore
```

**Structure Decision**: projeto único na raiz. `src/` contém somente o código da aplicação (escopo
`app`, incluindo o service worker), `scripts/` somente a automação (escopo `scripts`) e `tests/`
todos os testes e fixtures, fora dos dois escopos. Essa separação física por diretório é o que
torna a verificação de escopo (SC-004) uma simples checagem de prefixo. O `out/sw.js` gerado fica
fora da análise (arquivo gerado); a lógica analisada é a de `src/pwa/sw.ts`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Testes E2E (Restrições Técnicas, "testes end-to-end para o fluxo do responsável") adiados | Ainda não existe fluxo do responsável nem bloqueio | Um E2E sobre a página placeholder não testaria nada exigido pela constituição; Playwright entra junto com o primeiro fluxo |
| Arquivos de configuração da raiz (`next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`, `prettier.config.mjs`) fora dos dois escopos SonarQube (Princípio V, "Todo código DEVE ser analisado") | São configuração declarativa das ferramentas: não contêm lógica da aplicação nem da automação, nem funções com desvios a medir. O escopo `app` precisa conter só código da aplicação, porque é a base da comparação com o braço de vibe coding (FR-007), e o escopo `scripts` só a automação. Esses arquivos continuam passando pela etapa `padroes` do `verify` (ESLint e Prettier), e o efeito deles é verificado pelos testes (regras de complexidade, build) | Incluí-los no escopo `app` misturaria configuração de ferramentas ao código comparado no estudo. Incluí-los no escopo `scripts` acrescentaria arquivos sem funções às métricas da automação, o que só adiciona ruído. Um terceiro projeto Sonar para quatro arquivos declarativos traria mais um gate a manter sem nenhuma informação nova |
| Testes e fixtures (`tests/**`, `**/*.test.*`, `**/*.spec.*`) fora dos dois escopos SonarQube (Princípio V, "Todo código DEVE ser analisado") | A exclusão foi pedida na descrição da feature. O braço de vibe coding não terá testes; incluir os testes nas métricas do escopo `app` acrescentaria a este braço código (linhas, duplicação, code smells, complexidade e dívida) que o outro braço não tem, e a comparação deixaria de ser entre códigos de aplicação equivalentes. Os testes continuam passando pelas etapas `tipos` e `padroes` do `verify` (TypeScript strict, ESLint com os limites 10/15 e Prettier). As fixtures de complexidade violam os limites de propósito (T025) e reprovariam qualquer gate | Incluí-los no escopo `app` contaminaria a base da comparação do estudo. Um terceiro projeto `tests` exigiria um gate próprio, que as fixtures reprovariam por construção, sem produzir dado usado na comparação |
