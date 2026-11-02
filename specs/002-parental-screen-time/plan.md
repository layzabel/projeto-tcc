# Implementation Plan: Aplicação de Controle Parental de Tempo de Tela

**Branch**: `002-parental-screen-time` (diretório de feature; sem branch git própria — ver
Assumptions da spec) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-parental-screen-time/spec.md`

## Summary

Aplicação web estática (Next.js App Router, `output: 'export'`, TypeScript strict, Node.js 24 LTS)
para crianças de 2 a 5 anos e seu responsável, sem backend e sem banco de dados: todos os dados
ficam num único documento JSON no `localStorage` do aparelho, acessado por uma camada de
repositório com saneamento (limite sempre 15..60). Uma única página monta `<App/>`, cuja tela é
**derivada do estado** (configuração → mundo da criança/jogo/história → encerramento → bloqueio),
com a área do adulto como sobreposição protegida por toque de 3 s e senha de 4 dígitos (PBKDF2 da
Web Crypto). O tempo é contado com `performance.now()` em ticks de 1 s, com teto de 5 s por
intervalo, só em tela infantil visível, gravado a cada 5 s e ao ocultar; uma Web Lock garante
contagem única entre abas, e a virada do dia segue a data local. Sons são sintetizados pela Web
Audio API e a voz usa somente vozes locais em português. Toda a infraestrutura da
`001-quality-metrics-infra` é reutilizada como está (comando `verify`, Vitest e cobertura,
ESLint/Prettier com limites 10/15, SonarQube em dois escopos, service worker e manifest, registro
de métricas); a única extensão é a 5ª etapa `e2e` do `verify`, com Playwright sobre o `out/`,
que cobre fluxos do responsável, bloqueio, ausência de tráfego externo, offline, alvos de toque e
acessibilidade. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict: true`, `noUncheckedIndexedAccess`) em Node.js 24
LTS (`engines: ">=24 <25"`, `.nvmrc` = `24`), como na 001.

**Primary Dependencies**: runtime inalterado — `next` 16.4, `react`/`react-dom` 19.3. Dev novas:
`@playwright/test` e `@axe-core/playwright` (R22). APIs do navegador: `localStorage`, Web Crypto
(`subtle`, `getRandomValues`), Web Locks, Page Visibility, Web Audio, Web Speech (só vozes locais),
Vibration (opcional), Service Worker (da 001).

**Storage**: `localStorage`, chave única `tcc-cp:v1` com documento JSON versionado
([contracts/storage-schema.md](contracts/storage-schema.md)); sem servidor, sem banco, sem
IndexedDB (R3, desvio justificado no Complexity Tracking).

**Testing**: Vitest da 001 (projeto `app` em `jsdom`, agora incluindo `*.test.ts`) para domínio,
repositório, serviços e componentes, com relógio injetado e temporizadores falsos; Playwright
(Chromium) para E2E sobre `out/`, com `page.clock`, fixture de bloqueio de rede externa,
`@axe-core/playwright` e medição de alvos de toque ([contracts/e2e.md](contracts/e2e.md)).

**Target Platform**: navegadores modernos com suporte a service worker, prioritariamente celular
em retrato (Chrome Android, Safari iOS 16.4+), de 320 px até desktop, retrato e paisagem;
publicação como site estático em HTTPS (ou `localhost`).

**Project Type**: aplicação web estática de página única (frontend apenas) + scripts de
automação da 001.

**Performance Goals**: limiares de tempo (aviso, vaga-lumes, fim) refletidos na tela em ≤ 1 s;
perda máxima de 5 s de tempo usado após fechamento (FR-014); toque com resposta visual imediata
(< 100 ms) nas telas infantis; animações a 60 fps no celular sem movimento contínuo quando
"menos animação" está ativo.

**Constraints**: nenhuma requisição de rede para fora da origem (CSP `connect-src 'self'`,
verificado em toda a suíte E2E); offline após o primeiro acesso; nenhuma ação infantil depende de
leitura; alvos ≥ 64×64 px com 8 px de espaçamento; WCAG 2.1 AA no adulto e contraste AA no infantil;
sem flashes > 3/s; complexidade ciclomática ≤ 10 e cognitiva ≤ 15 por função; textos em pt-BR.

**Scale/Scope**: um aparelho, uma criança; documento < 8 KB (30 dias de histórico); 5 telas
infantis, 3 telas/sobreposições do adulto com 3 abas; 6 brinquedos, 6 páginas de história, 4
cartões; ~10 arquivos de teste E2E.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / Restrição | Situação | Evidência no plano |
|---|---|---|
| I. Proteção e Privacidade da Criança (inegociável) | ✅ | Consentimento em destaque, em linguagem simples, gravado sozinho com data/hora e versão antes de qualquer dado (FR-002/003; storage-schema). Dados mínimos: apelido ou primeiro nome opcional (≤ 18, orientação contra nome completo), ajustes, credencial derivada, dia atual e 30 dias de uso; faixa etária não coletada (minimização, Assumptions). Visualizar (painel), exportar (JSON local, sem credencial — export-format) e excluir/retirar consentimento (remove a chave → armazenamento vazio, SC-010). Área adulta com toque de 3 s + PIN e recuperação por multiplicação de 2×1 dígitos, sem dado pessoal (R8, R14). Voz só local, para o nome não sair do aparelho (R11). |
| II. Dados Exclusivamente no Aparelho (inegociável) | ✅ | `output: 'export'` da 001; uma página, sem Route Handlers/Server Actions; CSP `connect-src 'self'` mantida e endurecida (R21); sem CDN, fontes externas, analytics ou relatório de erro; sons sintetizados e ilustrações SVG embarcadas (R10, R13); service worker e manifest da 001 + ícones PNG locais (R20); fixture E2E falha qualquer requisição fora da origem e teste offline (R18, SC-011). `localStorage` é um dos dois armazenamentos admitidos pelo princípio. |
| III. Limite Diário Alinhado à SBP | ✅ | Padrão e máximo 60, mínimo 15, saneado inclusive em dados adulterados (FR-016, storage-schema). Contagem determinística, persistida, resistente a recarga, relógio monotônico com teto de 5 s (R4); virada à meia-noite local (R5). Aviso visual e sonoro sem texto obrigatório; bloqueio até o dia seguinte (o princípio admite "ou liberação explícita"; a spec escolhe a regra mais restritiva, sem liberação). Supervisão: convite diário do mascote e orientação ao responsável (FR-006a). Testes de virada, pausa, recarga e limite (quickstart Cenário 2, contagem/encerramento E2E). Períodos sem tela (SHOULD) fora do escopo, conforme a spec. |
| IV. Interface Infantil sem Leitura e sem Manipulação (inegociável) | ✅ | Ações infantis só por ícone, cor, imagem e áudio; textos são complemento para o adulto (screens §4). Alvos ≥ 64×64/8 px verificados em 320/390/1280 (R18). Sem anúncios, compras, links externos, push, pontos, sequências (substituídas por "dias com uso"), reprodução automática ou "só mais um"; o jogo não tem penalidade e termina voltando ao mundo. Encerramento calmo, com elogio e cartões de atividade do mundo real. Contraste AA (axe), sem flashes > 3/s, movimento reduzido (R13); responsivo 320 px → desktop. |
| V. Qualidade Mensurável (SonarQube) | ✅ | Reuso integral: Quality Gate `TCC`, escopos `app` (`src/`) e `scripts`, ESLint 10/15, `no-explicit-any`, Prettier, `strict`. Domínio em funções puras pequenas (`src/domain/`) para caber nos limites; `crypto.getRandomValues` em vez de `Math.random` evita hotspot S2245 (R9). Nenhuma exceção a limite numérico prevista. |
| VI. Rastreabilidade com IA | ✅ | `specs/002-parental-screen-time/metricas-ia.md` com as linhas de cada etapa registradas pelos comandos da 001 em sessão de registro; snapshot SonarQube ao fim de `implement` e de cada `correcao-N`; consolidado atualizado (quickstart Cenário 7). |
| Stack (Next.js App Router estático, React, TS strict, Node 24 via `engines` + `.nvmrc`) | ✅ | Inalterada (Technical Context). |
| Persistência via APIs do navegador em camada de repositório testável | ✅ (com desvio de preferência) | `src/storage/repository.ts` com `load`/`update`/`clear` e testes. `localStorage` também para o histórico, contra a preferência por IndexedDB — justificado no Complexity Tracking. |
| Dependências novas justificadas, sem rede/telemetria/anúncios | ✅ | Só `@playwright/test` e `@axe-core/playwright`, ambas de desenvolvimento (R22). |
| Testes (unitários do domínio; E2E do fluxo do responsável e do bloqueio) | ✅ | Unitários de contagem, limites, consentimento, senha, retenção e encerramento; E2E de configuração, acesso adulto, painel e bloqueio, dentro do `verify` (R16, R17, R19). Cobertura ≥ 80% nas linhas novas como meta (SHOULD). O adiamento de E2E registrado na 001 é encerrado aqui. |
| Verificação de privacidade antes da entrega | ✅ | Automática em todo teste E2E + DevTools (quickstart Cenário 6). |
| Idioma pt-BR | ✅ | Interface, falas, mensagens e documentação em pt-BR (FR-053). |
| Fluxo e portões (build, testes, Quality Gate, sem tráfego, toque ≥ 64 px, métricas) | ✅ | Todos presentes no critério de conclusão do [quickstart.md](quickstart.md). |

**Resultado (pré-Phase 0)**: aprovado. Princípios I, II e IV cumpridos integralmente, sem
exceção. Um desvio de **preferência** de restrição técnica (IndexedDB → `localStorage`) está
justificado no Complexity Tracking; não é violação de princípio.

**Re-check pós-Phase 1**: aprovado. O design não introduz servidor, rotas, requisições de rede nem
dados além dos listados em FR-042: o contrato de armazenamento lista exatamente os campos do
data-model, e a exportação os projeta sem a credencial. Pontos verificados no design:

- A voz do sistema poderia enviar texto (inclusive o nome) a servidores; resolvido aceitando só
  `localService === true` (R11).
- `Math.random` geraria hotspot e quebraria o gate; resolvido com `crypto.getRandomValues` (R9).
- A extensão do `verify` (etapa `e2e`) muda o contrato da 001 só por acréscimo; o teste
  `verify.test.ts` é atualizado para 5 etapas, sem recriar a infraestrutura (R19).
- `playwright.config.ts` e `tests/e2e/**` ficam fora dos escopos Sonar pelas exclusões já
  justificadas na 001 (configuração da raiz e testes); `scripts/e2e/serve-out.ts` entra no escopo
  `scripts`.

## Project Structure

### Documentation (this feature)

```text
specs/002-parental-screen-time/
├── plan.md              # Este arquivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 (guia de validação e checklist de aceitação)
├── contracts/
│   ├── screens.md         # derivação de telas, saídas, encerramento, marcação para testes
│   ├── storage-schema.md  # documento no localStorage, saneamento, escrita, abas
│   ├── export-format.md   # arquivo JSON exportado
│   └── e2e.md             # etapa `e2e` do verify e convenções dos testes de ponta a ponta
├── checklists/
│   └── requirements.md
├── metricas-ia.md       # registro de métricas (comandos da 001)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Somente o que é novo ou alterado; o restante da árvore da 001 permanece como está.

```text
src/                                  # escopo Sonar "app"
├── app/
│   ├── layout.tsx                    # ALTERADO: título, CSP endurecida (R21)
│   ├── page.tsx                      # ALTERADO: monta <App/>
│   ├── manifest.ts                   # ALTERADO: ícones PNG (R20)
│   ├── apple-icon.png                # NOVO (R20)
│   ├── globals.css                   # ALTERADO: tokens visuais, data-motion
│   └── (icon.svg, sw-register.tsx)   # inalterados
├── pwa/                              # inalterado (sw.ts, register.ts)
├── domain/                           # lógica pura, sem React nem APIs do navegador
│   ├── dates.ts                      # data local YYYY-MM-DD, diferença em dias
│   ├── limits.ts                     # saneamento de limite e aviso (FR-016, FR-036)
│   ├── day.ts                        # rollover, arquivamento, retenção (FR-018/019/044)
│   ├── counting.ts                   # tick com teto de 5 s, condições de contagem (FR-011..015)
│   ├── progress.ts                   # céu, sol, vaga-lumes, humor, aviso (FR-007..009)
│   ├── screen.ts                     # deriveScreen (contracts/screens.md)
│   ├── closure.ts                    # closureSteps por estilo (FR-027)
│   ├── history.ts                    # visões 7/30 dias, média, dias com uso (FR-040)
│   ├── game.ts                       # partida do jogo (FR-021..023)
│   ├── recovery.ts                   # conta de multiplicação (FR-032)
│   └── export.ts                     # projeção para o arquivo exportado (FR-041)
├── storage/
│   ├── schema.ts                     # tipos do documento e sanitize()
│   └── repository.ts                 # load/update/clear sobre localStorage, evento storage
├── platform/                         # adaptadores injetáveis das APIs do navegador
│   ├── clock.ts                      # monotonic() e now()
│   ├── random.ts                     # random() via crypto.getRandomValues
│   ├── credential.ts                 # PBKDF2 (criar, verificar)
│   ├── counter-lock.ts               # Web Lock tcc-cp-contagem
│   ├── visibility.ts                 # visibilitychange/pagehide
│   ├── sound.ts                      # Web Audio, fila até desbloqueio, obrigatório × efeito
│   ├── speech.ts                     # speechSynthesis só com voz local pt
│   ├── vibration.ts                  # navigator.vibrate opcional
│   └── download.ts                   # Blob + <a download>
├── content/                          # textos, falas, história, cartões, consentimento, SBP
│   ├── consent.ts
│   ├── phrases.ts
│   ├── story.ts
│   ├── toys.ts
│   └── activities.ts
└── ui/
    ├── App.tsx                       # 'use client'; carrega estado, deriva tela, sobreposição
    ├── state/                        # store (useSyncExternalStore), hooks useTimeCounter, useDayRollover
    ├── child/                        # World, Game, Story, Closure, Blocked
    ├── adult/                        # Setup (passos), PinPad, Recovery, Panel (Today, Settings, Log)
    └── shared/                       # Mascot, Sky, Fireflies, SpeechBubble, HoldButton, BigButton, Ring, BarChart

public/
└── icons/                            # NOVO: icon-192.png, icon-512.png (R20)

scripts/                              # escopo Sonar "scripts"
├── verify/stages.ts                  # ALTERADO: 5ª etapa `e2e` (R19)
└── e2e/serve-out.ts                  # NOVO: servidor estático de out/ em 127.0.0.1:4310

tests/                                # fora dos escopos Sonar
├── unit/
│   ├── app/
│   │   ├── domain/*.test.ts          # NOVO: domínio puro
│   │   ├── storage/*.test.ts         # NOVO: repositório e saneamento
│   │   ├── platform/*.test.ts        # NOVO: credencial, som, voz, lock (com dublês)
│   │   └── ui/*.test.tsx             # NOVO: componentes e hooks
│   └── scripts/
│       ├── verify.test.ts            # ALTERADO: 5 etapas
│       └── serve-out.test.ts         # NOVO
└── e2e/
    ├── fixtures.ts                   # semRedeExterna, estadoVazio, comDocumento, relogio
    └── *.spec.ts                     # mapeamento em contracts/e2e.md

playwright.config.ts                  # NOVO (configuração da raiz)
vitest.config.mts                     # ALTERADO: projeto app inclui tests/unit/app/**/*.test.ts
tsconfig.json                         # ALTERADO: inclui playwright.config.ts
package.json                          # ALTERADO: devDependencies novas, script "e2e"
.gitignore                            # ALTERADO: test-results/, playwright-report/
```

**Structure Decision**: mantém o projeto único na raiz definido na 001 — `src/` só código da
aplicação (escopo `app`), `scripts/` só automação (escopo `scripts`), `tests/` fora dos dois. Dentro
de `src/`, a lógica fica em camadas com dependência num só sentido: `domain` (puro) ← `storage` ←
`platform` (adaptadores injetáveis) ← `ui`. Isso permite testar contagem, virada, limites e
encerramento sem navegador e manter cada função dentro dos limites de complexidade.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `localStorage` também para o histórico de uso, contra "IndexedDB preferencial; `localStorage` para configurações pequenas" (Restrições Técnicas › Persistência) | FR-014 exige gravar ao ocultar/fechar a aplicação: em `pagehide` o navegador pode encerrar a página antes de uma transação assíncrona do IndexedDB terminar, e a escrita síncrona do `localStorage` termina antes. O documento inteiro tem menos de 8 KB (30 registros pequenos), cabe numa escrita atômica junto com o dia atual, e o evento `storage` dá a sincronização entre abas exigida por FR-020. O Princípio II admite os dois armazenamentos | IndexedDB arrisca perder até o último intervalo de contagem a cada fechamento e traria dependência nova (`fake-indexeddb`) só para testes; manter os dois (configuração no `localStorage`, histórico no IndexedDB) cria duas fontes a manter coerentes na virada do dia sem nenhum ganho para um volume tão pequeno |
