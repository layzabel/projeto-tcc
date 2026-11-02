---

description: "Lista de tarefas da feature 002 — Aplicação de Controle Parental de Tempo de Tela"
---

# Tasks: Aplicação de Controle Parental de Tempo de Tela

**Input**: documentos de design em `/specs/002-parental-screen-time/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: OBRIGATÓRIOS nesta feature — FR-055, Constituição (Princípio III e Restrições › Testes) e
[contracts/e2e.md](contracts/e2e.md) exigem testes unitários da lógica de domínio e testes de ponta a
ponta dos fluxos do responsável e do bloqueio. Em cada fase, os testes são escritos antes da
implementação e devem falhar primeiro.

**Organization**: tarefas agrupadas por história de usuário (US1–US8 da spec), para implementação e
teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história de usuário da tarefa (US1…US8)
- Caminhos relativos à raiz do repositório (`C:\Projeto_TCC_final\my-project`)

## Convenções válidas para todas as tarefas

- Camadas com dependência num só sentido: `src/domain` (puro, sem React nem APIs do navegador) ←
  `src/storage` ← `src/platform` (adaptadores injetáveis) ← `src/ui` (plan › Structure Decision).
- Cada função deve ficar com complexidade ciclomática ≤ 10 e cognitiva ≤ 15 (ESLint da 001);
  `any` explícito proibido; nada de `Math.random` (usar `src/platform/random.ts`, R9).
- Nenhuma requisição de rede, fonte, script ou imagem externa (Princípio II); textos em pt-BR.
- Telas infantis: todo elemento tocável com `data-alvo-infantil`, `aria-label` em pt-BR e
  ≥ 64×64 px CSS com 8 px entre alvos; raiz de cada tela com `data-tela="<nome>"`; mascote com
  `data-humor`, céu com `data-ceu`, vaga-lume com `data-aceso`; balão de fala com
  `aria-live="polite"` ([contracts/screens.md](contracts/screens.md) §5).
- Testes unitários do app em `tests/unit/app/**` (`*.test.ts` para domínio/repositório/plataforma,
  `*.test.tsx` para componentes), com relógio injetado ou `vi.useFakeTimers({ toFake: [...,
  'performance', 'Date'] })` (R16). Testes E2E em `tests/e2e/*.spec.ts`, sempre importando `test`
  de `tests/e2e/fixtures.ts`.

---

## Phase 1: Setup (Infraestrutura compartilhada)

**Purpose**: estender a infraestrutura da 001 só por acréscimo (E2E com Playwright, inclusão de
`*.test.ts` no projeto `app` do Vitest).

- [ ] T001 Instalar as dependências de desenvolvimento `@playwright/test` e `@axe-core/playwright` com versões exatas (`npm install -D -E`) e adicionar o script `"e2e": "playwright test"` em package.json; nenhuma dependência de runtime nova (R22). Instalar o navegador com `npx playwright install chromium` e, na etapa `e2e` do `verify` (T009), garantir que a ausência do Chromium falhe com mensagem clara indicando esse comando como pré-requisito ([contracts/e2e.md](contracts/e2e.md))
- [ ] T002 [P] Acrescentar `test-results/` e `playwright-report/` em .gitignore (e conferir que .prettierignore também os ignora)
- [ ] T003 [P] Alterar o projeto `app` em vitest.config.mts para `include: ['tests/unit/app/**/*.test.ts', 'tests/unit/app/**/*.test.tsx']`, mantendo `environment: 'jsdom'`, `setupFiles` e a cobertura `src/**`, `scripts/**` (R16)
- [ ] T004 [P] Acrescentar `playwright.config.ts` ao `include` de tsconfig.json (tests/e2e já está coberto por `tests/**/*.ts`)
- [ ] T005 [P] Escrever o teste tests/unit/scripts/serve-out.test.ts: o servidor responde só em `127.0.0.1`, `/` devolve `out/index.html`, tipos MIME corretos para `.html`, `.js`, `.css`, `.webmanifest`, `.svg`, `.png`, `.json`, 404 para arquivo ausente e recusa de caminho com `..` (usar diretório temporário como raiz injetada)
- [ ] T006 Implementar scripts/e2e/serve-out.ts com `node:http` sem dependência: serve `out/` em `http://127.0.0.1:4310` (porta e raiz exportáveis/injetáveis para o teste), `/` → `index.html`, MIME por extensão, sem nenhum outro comportamento ([contracts/e2e.md](contracts/e2e.md) › Execução) (depende de T005)
- [ ] T007 Criar playwright.config.ts na raiz: `testDir: 'tests/e2e'`, `fullyParallel: false`, `workers: 1`, `retries: 0`, projeto `chromium`, `use.baseURL: 'http://127.0.0.1:4310'`, viewport padrão 390×844, `webServer: { command: 'node scripts/e2e/serve-out.ts', url: 'http://127.0.0.1:4310', reuseExistingServer: !process.env.CI }` (depende de T001, T006)
- [ ] T008 Atualizar tests/unit/scripts/verify.test.ts para 5 etapas (`['tipos','padroes','testes','build','e2e']`, mensagem `VERIFY OK: 5/5 etapas`, falha na etapa `e2e` → código 5) — deve falhar antes de T009
- [ ] T009 Acrescentar a 5ª etapa em scripts/verify/stages.ts: `{ name: 'e2e', code: 5, commands: [{ cmd: 'npx', args: ['playwright', 'test'] }] }`, ampliando os tipos `name` e `code` de `Stage`; nada mais da infraestrutura muda (R19) (depende de T008)
- [ ] T010 Criar tests/e2e/fixtures.ts estendendo `test` do Playwright com: fixture automática `semRedeExterna` (registra `context.on('request')`, anota toda URL cuja origem não seja `http://127.0.0.1:4310` e que não seja `blob:`/`data:`, e falha no fim listando as URLs — SC-011); `estadoVazio` (limpa `localStorage` antes do primeiro carregamento); `comDocumento(doc)` (grava `tcc-cp:v1` por `addInitScript`); `relogio` (`page.clock.install({ time })` antes de navegar); registrador de falas que substitui `speechSynthesis` por `addInitScript` e expõe as falas registradas; helper `fixarSorteio(valores)` que substitui `crypto.getRandomValues` por sequência fixa; e um construtor `documentoValido(parcial)` conforme [contracts/storage-schema.md](contracts/storage-schema.md) (depende de T007)

---

## Phase 2: Foundational (Pré-requisitos bloqueantes)

**Purpose**: domínio base, armazenamento, adaptadores de plataforma, estado e casca do `<App/>` que
todas as histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes do fim desta fase.

### Testes da fundação (escrever primeiro)

- [ ] T011 [P] Escrever tests/unit/app/domain/dates.test.ts: `localDate(date)` devolve `YYYY-MM-DD` pelos componentes locais (`getFullYear/getMonth/getDate`), inclusive perto da meia-noite; `daysBetween(a, b)` em dias inteiros, inclusive atravessando mudança de horário de verão; `addDays(date, n)`; comparação por string ISO
- [ ] T012 [P] Escrever tests/unit/app/domain/limits.test.ts: `sanitizeLimit` com 0, 14, 17, 61, 999, `"abc"` → 15, 15, 15, 60, 60, 60 (arredonda ao múltiplo de 5 e limita a 15..60; não numérico → 60 — FR-016, SC-005); `sanitizeWarning` = `min(max(1, valor), 15, min(limiteHoje, limiteAmanhã) − 1)`, não inteiro → padrão 5 e mesma regra; `LIMIT_OPTIONS` = 15, 20, …, 60
- [ ] T013 [P] Escrever tests/unit/app/storage/schema.test.ts cobrindo toda a tabela "Leitura e saneamento" de [contracts/storage-schema.md](contracts/storage-schema.md): JSON inválido, `schemaVersion ≠ 1` ou `consent` inválido → sem documento; `setupCompleted = true` sem `credential`/`currentDay`/`settings` válidos → sem documento; `usedSeconds` negativo/não inteiro/acima do limite → `floor` e limitado a `0..limitMin×60`; `closure` desconhecido → `'nao-iniciado'` se não `exhausted`, senão `'em-andamento'`; `closureStyle` desconhecido → `'respiracao'`; booleans não booleanos → padrão; `nickname` não string → `null`, > 18 → truncado em 18; histórico inválido, duplicado ou com data ≥ `currentDay.date` → descartado; campos desconhecidos descartados; indicação de "saneamento alterou algo"
- [ ] T014 [P] Escrever tests/unit/app/storage/repository.test.ts (jsdom): `load` nunca lança; documento com `setupCompleted = false` é removido na carga; documento saneado é regravado quando mudou; `update(fn)` relê, aplica, saneia, garante `usedSeconds ≥ valor relido` no mesmo `date` e faz um único `setItem`; falha de `setItem` (`QuotaExceededError`, `SecurityError`) mantém o estado em memória e sinaliza `saveFailed`; `clear()` deixa `localStorage.length === 0`; assinatura do evento `storage` da chave `tcc-cp:v1` (inclusive `newValue = null`)
- [ ] T015 [P] Escrever tests/unit/app/domain/day.test.ts: `createDay(date, settings)` (usedSeconds 0, `limitMin = settings.dailyLimitMin`, flags falsas, `closure 'nao-iniciado'`); `rollover(doc, hoje)` com hoje maior (arquiva `{date, usedSeconds, limitMin, closureHappened: closure === 'concluido'}` e cria novo dia), igual e menor (nada muda — FR-019); retenção remove registros com idade > 30 dias em relação a `currentDay.date` (FR-044), tanto na virada quanto numa carga no mesmo dia (sem rollover), via `normalizeOnLoad`; `exhausted` com `closure 'nao-iniciado'` na carga → `'em-andamento'`
- [ ] T016 [P] Escrever tests/unit/app/domain/screen.test.ts para `deriveScreen(doc, sessão)` na ordem da tabela §1 de [contracts/screens.md](contracts/screens.md): não carregado → `carregando`; sem documento ou `setupCompleted = false` → `configuracao`; `closure = 'concluido'` → `bloqueio`; `em-andamento` ou `exhausted` → `encerramento`; senão `sessão.childScreen`; tempo esgotado com `childScreen = 'jogo'`/`'historia'` → `encerramento`
- [ ] T017 [P] Escrever tests/unit/app/platform/random.test.ts e tests/unit/app/platform/clock.test.ts: `random()` em `[0,1)` a partir de `crypto.getRandomValues`, `randomInt(min, max)` inclusivo, `shuffle` determinístico com fonte injetada; `Clock` com `monotonic()` (`performance.now`) e `now()` (`new Date()`)
- [ ] T018 [P] Escrever tests/unit/app/platform/sound.test.ts com dublê de `AudioContext`: um único contexto, `resume()` no primeiro `pointerdown`; sons obrigatórios (`falta-pouco`, `fim-de-tempo`) tocam sempre, mesmo com `sounds = false`, e ficam numa fila de no máximo um por tipo até o desbloqueio; sons de efeito (`acerto`, `reacao`, efeitos da história) silenciados com `sounds = false` (FR-037); `AbortSignal` abortado impede o som (R10)
- [ ] T019 [P] Escrever tests/unit/app/platform/speech.test.ts com dublê de `speechSynthesis`: só usa vozes com `lang` iniciando em `pt` **e** `localService === true`, preferindo `pt-BR`; sem voz elegível ou `voice = false` → não fala; cada fala nova chama `cancel()` antes; `AbortSignal` abortado cancela a fala (R11)
- [ ] T020 [P] Escrever tests/unit/app/ui/store.test.tsx: `getServerSnapshot` devolve "carregando"; após montagem o snapshot vem de `load` com `rollover` aplicado; `update` notifica assinantes; evento `storage` de outra aba recarrega o documento; `newValue = null` leva a "sem documento"
- [ ] T021 [P] Escrever tests/unit/app/ui/shared/HoldButton.test.tsx: com relógio falso, soltar antes de 3 000 ms (`pointerup`, `pointerleave`, `pointercancel`) zera o progresso e não chama `onComplete`; 3 000 ms contínuos chamam `onComplete` uma vez; Espaço/Enter seguro por 3 s tem o mesmo efeito; `contextmenu` bloqueado; `touch-action: none` (R14, FR-030)

### Implementação da fundação

- [ ] T022 [P] Implementar src/domain/dates.ts (`localDate`, `daysBetween`, `addDays`, `compareDates`) (faz T011 passar)
- [ ] T023 [P] Implementar src/domain/limits.ts: `LIMIT_MIN = 15`, `LIMIT_MAX = 60`, `LIMIT_STEP = 5`, `DEFAULT_LIMIT = 60`, `DEFAULT_WARNING = 5`, `WARNING_MIN = 1`, `WARNING_MAX = 15`, `LIMIT_OPTIONS`, `sanitizeLimit`, `sanitizeWarning` (faz T012 passar)
- [ ] T024 Implementar src/storage/schema.ts: tipos `StoredDocument`, `Consent { acceptedAt: string ISO 8601; textVersion: string }`, `Profile { nickname: string | null }` ("até 18 caracteres"), `Settings { dailyLimitMin; warningMin; closureStyle: 'respiracao' | 'historinha' | 'simples'; sounds; voice; reducedMotion }` com padrões 60/5/`'respiracao'`/`true`/`true`/`false`, `Credential { algorithm: 'PBKDF2-SHA-256'; iterations: 210000; salt; hash }`, `CurrentDay { date; usedSeconds; limitMin; warningPlayed; supervisionInviteShown; closure: 'nao-iniciado' | 'em-andamento' | 'concluido'; closureRequestedByAdult }`, `DailyRecord { date; usedSeconds; limitMin; closureHappened }` (0 a 30 itens, datas únicas, ordem cronológica) e `sanitize(raw)` com retorno `{ doc | null, changed }`, quebrado em funções pequenas por seção (faz T013 passar; depende de T022, T023)
- [ ] T025 Implementar src/storage/repository.ts: chave `STORAGE_KEY = 'tcc-cp:v1'`, `load()`, `update(fn)`, `clear()` (`removeItem`), `subscribe(listener)` sobre o evento `storage`, estado `saveFailed` exposto para a interface do adulto; recebe `Storage` injetável (faz T014 passar; depende de T024)
- [ ] T026 Implementar src/domain/day.ts: `createDay`, `rollover(doc, hoje)`, `applyRetention(history, hoje)` e `normalizeOnLoad` (exhausted → `'em-andamento'` e `applyRetention` em toda carga, mesmo sem virada — data-model › Retenção), mais derivados `limitSeconds`, `remainingSeconds`, `consumed`, `exhausted` do [data-model.md](data-model.md) (faz T015 passar; depende de T022, T024)
- [ ] T027 Implementar src/domain/screen.ts com `deriveScreen(doc, session)` e tipos `BaseScreen = 'carregando' | 'configuracao' | 'mundo' | 'jogo' | 'historia' | 'encerramento' | 'bloqueio'` e `ChildScreen = 'mundo' | 'jogo' | 'historia'` (faz T016 passar; depende de T026)
- [ ] T028 [P] Implementar src/platform/random.ts (`random`, `randomInt`, `shuffle`, fonte injetável) e src/platform/clock.ts (`Clock`, `systemClock`) (faz T017 passar)
- [ ] T029 [P] Implementar src/platform/sound.ts: Web Audio com `OscillatorNode` + `GainNode` e envelopes curtos para `falta-pouco`, `fim-de-tempo`, `acerto`, `reacao`, `risada`, `bocejo`, `flores`, `respira`; tabela `obrigatório × efeito`; fila de desbloqueio; `play(tipo, { sounds, signal })` (faz T018 passar)
- [ ] T030 [P] Implementar src/platform/speech.ts: `speak(texto, { voice, signal })` e `cancelSpeech()` só com voz local em português (faz T019 passar)
- [ ] T031 Implementar src/ui/state/store.ts com `useSyncExternalStore` (snapshot de servidor "carregando", leitura após montagem, `normalizeOnLoad` (com retenção) e `rollover` antes de expor o documento, ações `update`/`clear` que delegam ao repositório, sincronização entre abas) e src/ui/state/session.ts com o estado de sessão não persistido (`childScreen`, `adultOverlay: 'fechado' | 'senha' | 'recuperacao' | { painel: 'hoje' | 'ajustes' | 'registro' }`) (faz T020 passar; depende de T025, T026)
- [ ] T032 [P] Implementar src/ui/shared/HoldButton.tsx ("sou o adulto": Pointer Events, progresso por `performance.now()` desenhado em anel SVG por quadro, 3 000 ms, teclado Espaço/Enter, `aria-label="Sou o adulto: segure por 3 segundos"`, `data-alvo-infantil`, ≥ 64×64 px) (faz T021 passar)
- [ ] T033 [P] Implementar componentes compartilhados src/ui/shared/Mascot.tsx (SVG inline do vaga-lume, `data-humor="feliz|calmo|com-sono|dormindo|festejando"`), src/ui/shared/SpeechBubble.tsx (região `aria-live="polite"`) e src/ui/shared/BigButton.tsx (botão com ícone SVG, `aria-label`, `data-alvo-infantil`, ≥ 64×64 px), com testes em tests/unit/app/ui/shared/shared.test.tsx
- [ ] T034 Definir em src/app/globals.css os tokens visuais (cores com contraste AA, espaçamento ≥ 8 px entre alvos infantis, tamanho mínimo 64 px), layout responsivo de 320 px a desktop em retrato e paisagem (FR-051), animações só em CSS com período ≥ 1 s e sem alternar brilho (FR-050), e as regras `[data-motion="reduced"]` que trocam animações contínuas por estados finais e transições ≤ 150 ms (R13)
- [ ] T035 Alterar src/app/layout.tsx: `title` sem "em construção" (ex.: `'Controle Parental — Tempo de Tela'`) e CSP com os acréscimos `object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'self'`, mantendo `connect-src 'self'` (R21)
- [ ] T036 Criar src/ui/App.tsx (`'use client'`): lê o store, aplica `deriveScreen`, renderiza a tela neutra `carregando` (`data-tela="carregando"`, sem conteúdo infantil) e um ponto de montagem por tela base com `data-tela`; aplica `data-motion="reduced"` no `document.documentElement` quando `settings.reducedMotion` ou `matchMedia('(prefers-reduced-motion: reduce)')`; e alterar src/app/page.tsx para montar `<App/>` (depende de T027, T031)
- [ ] T037 Substituir tests/unit/app/page.test.tsx: a página monta `<App/>`, a primeira renderização mostra `data-tela="carregando"` e, sem documento, passa para `data-tela="configuracao"`; adicionar tests/unit/app/ui/App.test.tsx cobrindo `data-motion="reduced"` pelos dois gatilhos (depende de T036)

**Checkpoint**: `npx vitest run` e `npm run build` passam; a aplicação abre em `carregando` →
`configuracao`.

---

## Phase 3: User Story 1 — Configuração inicial com consentimento (Priority: P1) 🎯 MVP

**Goal**: no primeiro uso, o responsável aceita o consentimento (gravado sozinho, com data/hora e
versão), informa apelido opcional, escolhe o limite, cria a senha e chega ao mundo da criança.

**Independent Test**: com armazenamento vazio, percorrer o fluxo e verificar que o consentimento é
gravado antes de qualquer dado, que os valores ficam salvos e que a aplicação abre em `mundo`.

### Testes da User Story 1

- [ ] T038 [P] [US1] Escrever tests/unit/app/platform/credential.test.ts: `createCredential(pin)` gera `{ algorithm: 'PBKDF2-SHA-256', iterations: 210000, salt (16 bytes base64), hash (32 bytes base64) }`; `verifyCredential(pin, cred)` aceita a certa e recusa a errada; sal novo a cada criação; rejeita senha que não seja exatamente 4 dígitos `0-9`; o texto da senha não aparece no objeto (FR-043)
- [ ] T039 [P] [US1] Escrever tests/unit/app/domain/setup.test.ts para as funções puras da configuração: `acceptConsent(now, CONSENT_TEXT_VERSION)` → `{ schemaVersion: 1, consent, setupCompleted: false }` e nada mais; `completeSetup(doc, { nickname, dailyLimitMin, credential }, hoje)` → documento completo com `settings` padrão (aviso 5, `'respiracao'`, sons e voz ligados, menos animação desligado), `profile.nickname` aparado e vazio → `null`, e `currentDay` criado com `limitMin = dailyLimitMin`
- [ ] T040 [P] [US1] Escrever tests/unit/app/ui/adult/Setup.test.tsx: boas-vindas sem tela infantil; sem aceite não avança e `localStorage` continua vazio; aceite grava só o consentimento; campo de apelido com orientação visível de não informar o nome completo, `maxLength=18` e vazio permitido; limite inicia em 60, SBP visível, só 15..60 em passos de 5; confirmação diferente mostra erro e não grava; conclusão mostra a orientação de uso supervisionado e leva a `mundo`
- [ ] T041 [P] [US1] Escrever tests/e2e/configuracao.spec.ts (US1 cenários 1–8, SC-001): com `estadoVazio`, nenhuma tela infantil antes da conclusão; recusar consentimento → `localStorage` vazio; aceitar → `tcc-cp:v1` contém só `schemaVersion`, `consent` (`acceptedAt`, `textVersion`) e `setupCompleted: false`; apelido com 25 caracteres fica com 18; limite 15..60; senha divergente → erro; fluxo completo → `data-tela="mundo"`; recarregar no meio da configuração → recomeça nas boas-vindas e o documento incompleto é removido

### Implementação da User Story 1

- [ ] T042 [P] [US1] Criar src/content/consent.ts com `CONSENT_TEXT_VERSION = '1.0'`, o texto em linguagem simples (quais dados: apelido ou primeiro nome opcional, ajustes, senha em forma não legível, uso diário dos últimos 30 dias; para quê; que ficam só no aparelho; como ver, exportar e apagar; nenhum envio a terceiros) e `SBP_RECOMMENDATION` ("A Sociedade Brasileira de Pediatria recomenda no máximo 1 hora de tela por dia para crianças de 2 a 5 anos, sempre com um adulto por perto.") e `SUPERVISION_GUIDANCE` (FR-002, FR-006a)
- [ ] T043 [P] [US1] Implementar src/platform/credential.ts com `crypto.subtle.deriveBits` PBKDF2-SHA-256, 210 000 iterações, sal de 16 bytes por `crypto.getRandomValues`, 32 bytes, base64, comparação em tempo constante; a senha nunca é gravada nem registrada em log (faz T038 passar; R8)
- [ ] T044 [P] [US1] Implementar src/domain/setup.ts com `acceptConsent`, `completeSetup` e `normalizeNickname` (aparar, vazio → `null`, até 18 caracteres) (faz T039 passar; depende de T026)
- [ ] T045 [P] [US1] Implementar src/ui/adult/PinPad.tsx: teclado numérico próprio (0–9, apagar), 4 posições mascaradas, `onComplete(pin)`, botões com nome acessível e foco visível (WCAG 2.1 AA), reutilizável na senha, recuperação e troca
- [ ] T046 [US1] Implementar os passos em src/ui/adult/setup/: Welcome.tsx (propósito da aplicação), Consent.tsx (texto de `consent.ts` em destaque, botões "Aceito" e "Não aceito"; aceite chama `update` com `acceptConsent`), Nickname.tsx (campo "Apelido ou primeiro nome (opcional)" com `maxLength={18}` e orientação visível), Limit.tsx (opções de `LIMIT_OPTIONS`, padrão 60, `SBP_RECOMMENDATION`), Pin.tsx (PinPad duas vezes, erro "As senhas não coincidem" sem gravar), Done.tsx (`SUPERVISION_GUIDANCE` e botão "Começar"); os valores ficam em memória até a conclusão (depende de T042, T044, T045)
- [ ] T047 [US1] Implementar src/ui/adult/Setup.tsx orquestrando boas-vindas → consentimento → apelido → limite → senha → conclusão; na conclusão faz uma única escrita com `completeSetup` + `createCredential` (contracts/storage-schema.md: "os demais campos são gravados juntos, numa única escrita"); montar em `configuracao` no src/ui/App.tsx (faz T040 e T041 passarem; depende de T043, T046)
- [ ] T048 [US1] Criar src/ui/child/World.tsx mínimo (`data-tela="mundo"`, mascote e `HoldButton` no canto) e montá-lo em `mundo` no src/ui/App.tsx, para que o fim da configuração tenha destino; a US2 completa o conteúdo (depende de T032, T033, T047)

**Checkpoint**: configuração completa funciona sozinha; `npx playwright test configuracao` passa.

---

## Phase 4: User Story 2 — Mundo da criança e contagem do tempo (Priority: P1)

**Goal**: mundo da criança com mascote e três botões; tempo restante comunicado sem números; aviso de
"falta pouco" uma vez por dia; contagem só em tela infantil visível, persistida, monotônica, única
entre abas, com virada à meia-noite local.

**Independent Test**: com configuração concluída e relógio controlado, simular tempo nas telas
infantis, em segundo plano e na área do adulto e verificar tempo contado, estado visual, aviso e
persistência após recarga.

### Testes da User Story 2

- [ ] T049 [P] [US2] Escrever tests/unit/app/domain/counting.test.ts: `shouldCount({ screen, visible, exhausted, overlayOpen })` verdadeiro só para `mundo`/`jogo`/`historia` fora do encerramento, visível, sem sobreposição adulta e com tempo (FR-011/012); `tick(state, agora)` com `delta = clamp(agora − último, 0, 5000)`; 60 min de ticks intercalados com segundo plano e área do adulto → diferença ≤ 5 s (SC-002); intervalos de +2 h, −1 h, +24 h → acréscimo ≤ 5 s e nunca redução (SC-003, FR-013); transferência do acumulador para `usedSeconds` inteiro com `max(gravado, novo)` e limitado a `limitSeconds` (FR-015)
- [ ] T050 [P] [US2] Escrever tests/unit/app/domain/progress.test.ts: `skyPhase` (`remaining/limit > 2/3` → `dia`; `> 1/3` → `tarde`; senão `anoitecer`); `firefliesLit = 5 − min(5, floor(consumed / 0.2))` (12 min de 60 → 4); `sunPosition = 1 − consumed`; `mascotMood` (`remaining > limit/2` → `feliz`; `remaining > warningMin×60` → `calmo`; senão `com-sono`); `shouldWarn = !warningPlayed && !exhausted && remainingSeconds ≤ warningMin×60`, inclusive quando a reabertura já começa abaixo do aviso (FR-007..009)
- [ ] T051 [P] [US2] Escrever tests/unit/app/platform/counter-lock.test.ts e tests/unit/app/platform/visibility.test.ts: com dublê de `navigator.locks`, pede `tcc-cp-contagem` exclusivo quando as condições passam a valer e solta quando deixam; sem `navigator.locks`, conta normalmente; `visibilitychange → hidden` e `pagehide` disparam o callback de gravação
- [ ] T052 [P] [US2] Escrever tests/unit/app/ui/useTimeCounter.test.tsx e tests/unit/app/ui/useDayRollover.test.tsx com temporizadores falsos: ticker de 1 s só ativo com `shouldCount` e trava; grava a cada 5 s de contagem, ao sair de tela infantil, ao ocultar e em `pagehide`; ao reativar, `último` é reiniciado (tempo oculto não entra); `useDayRollover` checa a data na carga, a cada tick, na volta à visibilidade e a cada 30 s mesmo fora das telas infantis (R5)
- [ ] T053 [P] [US2] Escrever tests/unit/app/ui/child/World.test.tsx: cumprimento com nome e genérico; convite "chame um adulto para brincar junto" na primeira abertura do dia, grava `supervisionInviteShown = true` e não se repete; botão Mascote mostra frase de um conjunto fixo (fonte de sorteio injetada); botões Brincar e História mudam `childScreen`; `data-ceu`, vaga-lumes `data-aceso` e `data-humor` conforme o tempo; aviso toca `falta-pouco` uma vez, grava `warningPlayed = true`, mascote `com-sono` e texto complementar opcional com minutos restantes
- [ ] T054 [P] [US2] Escrever tests/e2e/contagem.spec.ts (US2 cenários 3–9, SC-002, SC-003, SC-004, FR-020): com `relogio` instalado sempre na hora base fixa de 10:00 (horário local) e `comDocumento`, para que os saltos de relógio não cruzem a meia-noite; 12 min de 60 → 4 vaga-lumes acesos; aviso aos 5 min restantes (registrador de falas + `data-humor="com-sono"`); 10 min em segundo plano (`visibilitychange` simulado) não contam; recarga com 20 min mantém 20 min (perda ≤ 5 s); `setSystemTime` +2 h e −1 h a partir das 10:00 (mesmo dia) alteram ≤ 5 s e nunca reduzem; em caso separado, passagem da meia-noite arquiva o dia e zera; limite alterado hoje para 30 vale só amanhã; duas abas no mesmo contexto não contam em dobro
- [ ] T055 [P] [US2] Escrever tests/e2e/supervisao.spec.ts (FR-006a, SC-015): convite exatamente uma vez por dia na primeira abertura do mundo, inclusive após recargas, e de novo após a virada; orientação de uso supervisionado visível na conclusão da configuração (a da aba Hoje é verificada na US5)

### Implementação da User Story 2

- [ ] T056 [P] [US2] Implementar src/domain/counting.ts (`shouldCount`, `tick`, `flush`, constante `MAX_INTERVAL_MS = 5000`, `SAVE_EVERY_SECONDS = 5`) (faz T049 passar)
- [ ] T057 [P] [US2] Implementar src/domain/progress.ts (`skyPhase`, `firefliesLit`, `sunPosition`, `mascotMood`, `shouldWarn`, `remainingMinutesLabel`) (faz T050 passar)
- [ ] T058 [P] [US2] Implementar src/platform/counter-lock.ts (`acquireCounterLock(): Promise<release>` com Web Lock `tcc-cp-contagem` e degradação sem `navigator.locks`) e src/platform/visibility.ts (`isVisible`, `onHidden`, `onVisible`) (faz T051 passar)
- [ ] T059 [P] [US2] Criar src/content/phrases.ts com: cumprimento com nome (`(nome) => ...`) e genérico; convite de supervisão; ≥ 5 frases carinhosas (FR-005); "falta pouquinho"; aviso de encerramento com nome e genérico; incentivo do jogo; comemoração; elogio ("você brincou muito bem hoje"); despedida ("até amanhã"); mensagem do bloqueio — todas em pt-BR
- [ ] T060 [US2] Implementar src/ui/state/useTimeCounter.ts e src/ui/state/useDayRollover.ts sobre `counting.ts`, `day.ts`, `counter-lock.ts`, `visibility.ts` e `Clock` injetado; gravação por `repository.update` (faz T052 passar; depende de T056, T058)
- [ ] T061 [P] [US2] Implementar src/ui/shared/Sky.tsx (`data-ceu="dia|tarde|anoitecer|noite"`, sol pela `sunPosition`, estrelas no anoitecer) e src/ui/shared/Fireflies.tsx (5 vaga-lumes com `data-aceso`), SVG inline, sem números
- [ ] T062 [US2] Completar src/ui/child/World.tsx: mascote com humor, balão, três `BigButton` (Brincar, História, Mascote) com ícones, cumprimento, convite diário (balão e voz se ligada; não bloqueia o uso), frase sorteada por `random.ts`, aviso de "falta pouco" (`sound.play('falta-pouco')` obrigatório, fala, `warningPlayed = true`), céu e vaga-lumes, `HoldButton` no canto (faz T053 passar; depende de T057, T059, T061)
- [ ] T063 [US2] Ligar em src/ui/App.tsx os hooks `useTimeCounter` (com `shouldCount` recebendo tela base, visibilidade e `adultOverlay`) e `useDayRollover` (o bloqueio do dia anterior vira `mundo` sozinho) e montar provisoriamente `jogo`/`historia` como `World` até a US7/US8 (faz T054 e T055 passarem; depende de T060, T062)

**Checkpoint**: US1 + US2 funcionam; tempo contado e visível sem números.

---

## Phase 5: User Story 3 — Encerramento lúdico e bloqueio (Priority: P1)

**Goal**: ao esgotar o tempo (ou "Encerrar agora"), o encerramento roda as etapas do estilo
escolhido, uma execução por vez, e termina num bloqueio que persiste a recargas e acaba sozinho na
virada do dia.

**Independent Test**: com relógio controlado, esgotar o limite em cada estilo e verificar ordem das
etapas, ausência de contagem, bloqueio após recarga e liberação à meia-noite.

### Testes da User Story 3

- [ ] T064 [P] [US3] Escrever tests/unit/app/domain/closure.test.ts: `closureSteps('respiracao')` = `aviso, respiracao, respiracao, respiracao, elogio, escolha, despedida`; `'historinha'` = `aviso, historia, elogio, escolha, despedida`; `'simples'` = `aviso, elogio, escolha, despedida` (FR-027); `startClosure(doc)` grava `'em-andamento'`; `finishClosure(doc)` grava `'concluido'`; nenhuma função volta a `'nao-iniciado'` no mesmo dia (FR-015)
- [ ] T065 [P] [US3] Escrever tests/unit/app/ui/child/Closure.test.tsx com temporizadores falsos: cada estilo percorre as etapas na ordem e termina gravando `'concluido'`; som `fim-de-tempo` (obrigatório) e fala com o nome no aviso; escolha espera toque num dos 4 cartões e o mascote reage; desmontar/remontar no meio aborta a execução anterior (nenhum temporizador, som ou fala antiga dispara — FR-028, SC-006); `HoldButton` presente em todas as etapas
- [ ] T066 [P] [US3] Escrever tests/unit/app/ui/child/Story.test.tsx: 6 páginas com cenário (`dia|tarde|anoitecer|noite`), frase falada se voz ligada, dica visual de toque; primeiro toque dispara o efeito e o segundo avança; ao fim chama `onFinish` (FR-024, FR-025)
- [ ] T067 [P] [US3] Escrever tests/unit/app/ui/child/Blocked.test.tsx: céu `noite`, mascote `dormindo`, mensagem de que a tela foi descansar, tempo até a meia-noite como complemento opcional, `HoldButton` presente, nenhum outro alvo
- [ ] T068 [P] [US3] Escrever tests/e2e/encerramento.spec.ts (US3, SC-006, SC-007): para cada estilo, esgotar o limite com `page.clock.runFor` e verificar a sequência pelos `data-*`/balões e o registrador de falas até `data-tela="bloqueio"`; tempo acabando dentro do jogo leva imediatamente ao encerramento; recarga no meio recomeça do aviso; bloqueio persiste após recarga; meia-noite com a aplicação aberta libera para `mundo`; tempo não avança durante encerramento e bloqueio

### Implementação da User Story 3

- [ ] T069 [P] [US3] Implementar src/domain/closure.ts (`ClosureStep`, `closureSteps(style)`, `startClosure`, `finishClosure`, durações das etapas por tempo) (faz T064 passar)
- [ ] T070 [P] [US3] Criar src/content/activities.ts (4 cartões: brincar com um brinquedo, desenhar, dar um abraço em quem cuida de você, ver um livro — cada um com ícone, `aria-label` e reação do mascote) e src/content/story.ts (6 páginas `{ cenario: 'dia'|'tarde'|'anoitecer'|'noite', frase, efeito: 'risada'|'luz-enfraquecendo'|'bocejo'|'respiracao'|'flores'|'dormir' }` sobre o mascote se preparando para descansar)
- [ ] T071 [US3] Implementar src/ui/child/Story.tsx (`data-tela="historia"` quando avulsa; prop `onFinish`; cenário pela `Sky`, frase no balão e por `speak`, dica de toque animada, efeito no 1º toque com som de efeito, avanço no 2º; toda a página é um alvo infantil) (faz T066 passar; depende de T070)
- [ ] T072 [US3] Implementar src/ui/child/Closure.tsx: `data-tela="encerramento"`, um `AbortController` por montagem, executa `closureSteps(settings.closureStyle)` (aviso com `fim-de-tempo` e fala com nome; Respiração com 3 ciclos guiados inspira/solta; Historinha com `<Story onFinish>`; elogio com mascote indo descansar; escolha com 4 `BigButton` de `activities.ts`; despedida), grava `finishClosure` ao fim; sons, falas e temporizadores recebem o `signal`; `HoldButton` em todas as etapas (faz T065 passar; depende de T069, T071)
- [ ] T073 [P] [US3] Implementar src/ui/child/Blocked.tsx (`data-tela="bloqueio"`, `Sky` noite, mascote `dormindo`, mensagem, tempo até a meia-noite opcional, `HoldButton`) (faz T067 passar)
- [ ] T074 [US3] Montar `encerramento` e `bloqueio` em src/ui/App.tsx; quando a tela base passa a `encerramento` por `exhausted`, gravar `startClosure` uma vez; garantir que a contagem não roda nessas telas (faz T068 passar; depende de T072, T073)

**Checkpoint**: as três histórias P1 entregam o produto mínimo (configurar → usar → encerrar → bloquear).

---

## Phase 6: User Story 4 — Acesso protegido à área dos adultos (Priority: P2)

**Goal**: segurar o botão por 3 s, digitar a senha no teclado próprio e entrar no painel;
recuperação por multiplicação; voltar leva à tela coerente com o estado.

**Independent Test**: em mundo, encerramento e bloqueio, segurar por menos e por mais de 3 s, testar
senhas certas e erradas e a recuperação, verificando o destino de cada caminho.

### Testes da User Story 4

- [ ] T075 [P] [US4] Escrever tests/unit/app/domain/recovery.test.ts: `newChallenge(random)` com `a ∈ 12..19` e `b ∈ 3..9` (FR-032), `checkAnswer(challenge, resposta)`; distribuição cobre todos os fatores com fonte injetada
- [ ] T076 [P] [US4] Escrever tests/unit/app/ui/adult/AdultAccess.test.tsx: `PinEntry` com senha certa abre `painel(hoje)`; errada mostra "Senha incorreta", chama `vibrate` quando suportado (e não falha sem suporte) e limpa os dígitos; "Esqueci a senha" abre `Recovery`; resposta errada gera nova conta e não muda a senha; certa permite criar e confirmar nova senha, e a antiga deixa de valer; nenhum dado pessoal pedido
- [ ] T077 [P] [US4] Escrever tests/e2e/acesso-adulto.spec.ts (US4, SC-008): soltar antes de 3 s → nada; 3 s → teclado; senha errada → mensagem e dígitos limpos; certa → painel e contagem pausada (tempo não avança com `runFor`); recuperação com sorteio fixado; voltar a partir de mundo, encerramento (recomeça do início) e bloqueio leva à tela coerente (FR-033)

### Implementação da User Story 4

- [ ] T078 [P] [US4] Implementar src/domain/recovery.ts (`newChallenge`, `checkAnswer`) (faz T075 passar)
- [ ] T079 [P] [US4] Implementar src/platform/vibration.ts (`vibrate(ms)` que só chama `navigator.vibrate` quando existir)
- [ ] T080 [US4] Implementar src/ui/adult/PinEntry.tsx (PinPad + `verifyCredential`, erro com `role="alert"`, vibração, botão "Esqueci a senha", voltar) e src/ui/adult/Recovery.tsx (conta `a × b`, campo numérico, nova senha + confirmação com PinPad, grava nova credencial com sal novo) (faz T076 passar; depende de T043, T045, T078, T079)
- [ ] T081 [US4] Criar a casca src/ui/adult/Panel.tsx: diálogo com três abas (`Hoje`, `Ajustes`, `Registro`) por `role="tablist"`, `SBP_RECOMMENDATION` visível em todas (FR-034), botão voltar que fecha a sobreposição, aviso persistente "Não foi possível salvar os dados neste aparelho" quando `saveFailed`; conteúdo das abas preenchido nas US5/US6
- [ ] T082 [US4] Ligar a sobreposição em src/ui/App.tsx: `HoldButton.onComplete` → `adultOverlay = 'senha'`; senha correta → painel; enquanto aberta, `shouldCount` recebe `overlayOpen = true` (pausa — FR-012); fechar reavalia `deriveScreen` (FR-033) e, sobre `encerramento`, remonta o `Closure` para recomeçar do início (FR-028) (faz T077 passar; depende de T080, T081)

**Checkpoint**: área do adulto acessível só com 3 s + senha; voltar é sempre coerente.

---

## Phase 7: User Story 5 — Painel do responsável: Hoje e Ajustes (Priority: P2)

**Goal**: acompanhar o dia, encerrar agora e alterar todos os ajustes, inclusive apagar os dados.

**Independent Test**: com dados preparados, abrir cada aba, alterar cada ajuste e verificar o efeito
nas telas infantis e no armazenamento.

### Testes da User Story 5

- [ ] T083 [P] [US5] Escrever tests/unit/app/domain/settings.test.ts: `validateNewLimit(doc, novo)` recusa quando `warningMin ≥ novo` com a mensagem "Reduza o aviso antes de escolher este limite" e só aceita 15..60 em passos de 5; `validateWarning(doc, novo)` aceita só inteiros 1..15 e `< min(currentDay.limitMin, settings.dailyLimitMin)`; alterar `dailyLimitMin` não muda `currentDay.limitMin` (FR-017); `requestCloseNow(doc)` grava `closure = 'em-andamento'` e `closureRequestedByAdult = true` e é recusado em dia `'concluido'`; `dayStatus` = `encerrado` só com `'concluido'`
- [ ] T084 [P] [US5] Escrever tests/unit/app/ui/adult/Today.test.tsx e tests/unit/app/ui/adult/Settings.test.tsx: 25 de 60 → anel 25/60, "Faltam 35 minutos", "Em uso", encerramento "não ocorreu"; "Encerrar agora" com confirmação explicando que o bloqueio vale até o dia seguinte; indisponível em dia encerrado; orientação de uso supervisionado na aba Hoje; Ajustes mostra limite de hoje e de amanhã, estilo, sons, voz, menos animação, nome (até 18), trocar senha recusando senha atual errada, apagar dados e retirar consentimento com confirmação
- [ ] T085 [P] [US5] Escrever a parte US5 de tests/e2e/painel.spec.ts (US5 cenários 1–10): valores da aba Hoje; "Encerrar agora" confirmado → sobreposição fecha e o encerramento começa, cancelado → nada muda; aviso fora da faixa recusado; sons desligados → jogo sem som de acerto, mas `falta-pouco` e `fim-de-tempo` tocam (contador de sons por `addInitScript` no `AudioContext`); voz desligada → registrador de falas vazio e balão presente; menos animação → `data-motion="reduced"`; troca de senha com senha atual errada recusada; "Apagar todos os dados" → `localStorage.length === 0` e `data-tela="configuracao"` (SC-010); SBP em todas as abas

### Implementação da User Story 5

- [ ] T086 [P] [US5] Implementar src/domain/settings.ts (`validateNewLimit`, `validateWarning`, `applySettings`, `requestCloseNow`, `dayStatus`) (faz T083 passar; depende de T023, T069)
- [ ] T087 [P] [US5] Implementar src/ui/shared/Ring.tsx: indicador circular em SVG com `role="img"`, rótulo acessível ("25 de 60 minutos usados") e tabela equivalente `sr-only` (R15)
- [ ] T088 [US5] Implementar src/ui/adult/panel/Today.tsx (anel, minutos restantes, estado do dia, encerramento ocorrido ou não, `SUPERVISION_GUIDANCE`, "Encerrar agora" com diálogo de confirmação; confirmado → `requestCloseNow` e fecha a sobreposição) (depende de T086, T087)
- [ ] T089 [US5] Implementar src/ui/adult/panel/Settings.tsx: limite (15..60, passo 5, "Hoje: X min · A partir de amanhã: Y min", recusa com mensagem quando aviso ≥ novo limite), aviso (1..15, padrão 5, menor que os dois limites), estilo (Respiração padrão, Historinha, Simples), interruptores de sons, voz e menos animação, nome (`maxLength={18}`, orientação contra nome completo), "Trocar a senha" (atual + nova + confirmação, recusa se a atual estiver errada), "Apagar todos os dados" e "Retirar consentimento" com confirmação → `repository.clear()` e `configuracao` (FR-036, FR-039, FR-045); todos os controles com rótulo e foco visível (WCAG 2.1 AA) (depende de T086)
- [ ] T090 [US5] Ligar as abas `hoje` e `ajustes` em src/ui/adult/Panel.tsx e garantir em src/ui/App.tsx que `requestCloseNow` fecha a sobreposição e leva ao `encerramento` (faz T084 e T085 passarem; depende de T088, T089)

**Checkpoint**: controle completo do responsável sobre o dia e os ajustes.

---

## Phase 8: User Story 6 — Registro, exportação e direitos sobre os dados (Priority: P3)

**Goal**: aba Registro com 7 barras, média, dias com uso, total da semana e 30 dias; exportação JSON
sem a credencial.

**Independent Test**: com histórico conhecido de 40 dias, comparar os valores da aba e do arquivo
exportado com os esperados.

### Testes da User Story 6

- [ ] T091 [P] [US6] Escrever tests/unit/app/domain/history.test.ts com histórico conhecido de 40 dias: `ultimos7` de `hoje − 6` a `hoje` com o dia atual e zeros nos dias ausentes; `totalSemana` = soma; `mediaDiaria` = total ÷ 7 (sempre ÷ 7, uma casa decimal, `round`); `diasComUso` 0..7 com `usedSeconds > 0` e nenhuma sequência calculada; `ultimos30` de `hoje − 29` a `hoje`, do mais recente ao mais antigo; minutos do dia atual por `floor` (FR-040, SC-009)
- [ ] T092 [P] [US6] Escrever tests/unit/app/domain/export.test.ts: para um documento conhecido, `toExport(doc, agora)` produz exatamente o objeto de [contracts/export-format.md](contracts/export-format.md) (`formato: 'controle-parental-exportacao'`, `versaoFormato: 1`, `exportadoEm`, `consentimento`, `crianca.apelido` ou `null`, `ajustes`, `diaAtual`, `historico` cronológico e sem dias ausentes); a serialização com 2 espaços não contém a chave `credential` nem os valores de `salt` e `hash`; `exportFileName(data)` = `controle-parental-dados-AAAA-MM-DD.json` (FR-041, FR-043, SC-010)
- [ ] T093 [P] [US6] Escrever a parte US6 de tests/e2e/painel.spec.ts: com `comDocumento` de 40 dias de histórico, a aba Registro mostra 7 barras, média, dias com uso, total e 30 linhas com os valores esperados; registros com mais de 30 dias não existem mais em `tcc-cp:v1` após a carga; "Exportar" dispara o evento `download` com o nome esperado e conteúdo sem `credential`/`salt`/`hash` (depende de T085, mesmo arquivo)

### Implementação da User Story 6

- [ ] T094 [P] [US6] Implementar src/domain/history.ts (`last7`, `weekTotal`, `dailyAverage`, `daysWithUse`, `last30`) (faz T091 passar; depende de T022)
- [ ] T095 [P] [US6] Implementar src/domain/export.ts (`toExport`, `exportFileName`, `serializeExport`) (faz T092 passar)
- [ ] T096 [P] [US6] Implementar src/platform/download.ts (`downloadJson(nome, texto)` com `Blob` `application/json`, `URL.createObjectURL`, `<a download>` e `revokeObjectURL`, sem requisição de rede)
- [ ] T097 [P] [US6] Implementar src/ui/shared/BarChart.tsx: 7 barras em SVG em minutos, rótulo acessível e tabela equivalente com os mesmos números (R15)
- [ ] T098 [US6] Implementar src/ui/adult/panel/Log.tsx (gráfico, média, "Dias com uso nos últimos 7 dias: N de 7", total da semana, tabela dos 30 dias com data e minutos, botão "Exportar") e ligá-la na aba `registro` de src/ui/adult/Panel.tsx (faz T093 passar; depende de T094–T097)

**Checkpoint**: acompanhamento e direito de acesso aos dados completos.

---

## Phase 9: User Story 7 — Jogo "Guardar os brinquedos" (Priority: P3)

**Goal**: tocar um brinquedo e a caixa da mesma cor; acerto guarda com som; erro devolve sem
penalidade; seis guardados → comemoração e volta ao mundo.

**Independent Test**: com sorteio controlado, executar acertos e erros e verificar progresso, sons,
falas e retorno automático.

### Testes da User Story 7

- [ ] T099 [P] [US7] Escrever tests/unit/app/domain/game.test.ts: `newGame(random)` com 6 brinquedos em ordem aleatória, cada um `'azul' | 'vermelho'`, com pelo menos 1 de cada cor (FR-021); `select`, `drop(caixa)` com cor igual → guardado e progresso +1; cor diferente → volta, progresso não diminui, evento `incentivo`; `isFinished` com 6 guardados
- [ ] T100 [P] [US7] Escrever tests/unit/app/ui/child/Game.test.tsx: 6 brinquedos e 2 caixas como alvos infantis; som `acerto` só com sons ligados e nunca som de erro; incentivo do mascote no erro; indicador de progresso visual (sem números para a criança); ao fim mascote `festejando` e `onFinish` após ~3 s; botão voltar (ícone) sempre presente
- [ ] T101 [P] [US7] Escrever a parte do jogo de tests/e2e/atividades.spec.ts (US7 cenários 1–5) com `fixarSorteio`: abrir por Brincar, acertos, erro, sexto guardado → `data-humor="festejando"` → `data-tela="mundo"`; voltar → `mundo`

### Implementação da User Story 7

- [ ] T102 [P] [US7] Criar src/content/toys.ts (6 tipos de brinquedo com ilustração SVG e `aria-label`, e as caixas azul e vermelha com cores de contraste AA)
- [ ] T103 [P] [US7] Implementar src/domain/game.ts (`newGame`, `select`, `drop`, `isFinished`) (faz T099 passar; depende de T028)
- [ ] T104 [US7] Implementar src/ui/child/Game.tsx (`data-tela="jogo"`, brinquedos e caixas com `data-alvo-infantil`, sons de efeito, falas, comemoração, retorno automático em ~3 s com temporizador cancelado ao desmontar, botão voltar) (faz T100 passar; depende de T102, T103)
- [ ] T105 [US7] Montar `jogo` em src/ui/App.tsx no lugar do provisório da T063, com `onFinish`/voltar → `childScreen = 'mundo'` (faz T101 passar; depende de T104)

**Checkpoint**: jogo funciona e conta tempo como tela infantil.

---

## Phase 10: User Story 8 — História interativa (Priority: P3)

**Goal**: história de 6 páginas aberta pelo mundo da criança, voltando ao mundo ao fim.

**Independent Test**: abrir pelo mundo e percorrer as 6 páginas verificando cenário, frase, efeito e
avanço.

- [ ] T106 [P] [US8] Escrever a parte da história de tests/e2e/atividades.spec.ts (US8 cenários 1–3): abrir por História, cada página com `data-ceu` do cenário, frase no balão e no registrador de falas, 1º toque com efeito e 2º com avanço, fim → `data-tela="mundo"`; tempo continua contando durante a história avulsa (depende de T101, mesmo arquivo)
- [ ] T107 [US8] Montar `historia` em src/ui/App.tsx com `<Story onFinish={() => childScreen = 'mundo'} />` (componente da T071) no lugar do provisório da T063, mantendo a contagem ativa (FR-011) (faz T106 passar; depende de T071)

**Checkpoint**: todas as histórias funcionam de forma independente.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: instalação, offline, verificações automáticas transversais e portões da constituição.

- [ ] T108 [P] Criar os ícones PNG originais public/icons/icon-192.png e public/icons/icon-512.png (também usados como `purpose: "maskable"`) e src/app/apple-icon.png (180×180), versionados (R20)
- [ ] T109 Atualizar src/app/manifest.ts para incluir os ícones PNG 192 e 512 (`any` e `maskable`), mantendo o SVG, e conferir que entram na lista de cache gerada por scripts/pwa/generate-sw.ts (depende de T108)
- [ ] T110 [P] Escrever tests/e2e/offline.spec.ts (FR-047, SC-011): carregar, esperar o service worker ativo, `context.setOffline(true)`, recarregar e percorrer configuração → mundo → jogo
- [ ] T111 [P] Escrever tests/e2e/toque.spec.ts (SC-012, FR-049, FR-051): nas larguras 320, 390 e 1280 em retrato e também nos viewports em paisagem 844×390 e 640×320 (Constituição IV), e nas telas `mundo`, `jogo`, `historia`, cada etapa de `encerramento` e `bloqueio`, medir `boundingBox()` de todo `[data-alvo-infantil]`: ≥ 64×64 e distância ≥ 8 px entre cada par
- [ ] T112 [P] Escrever tests/e2e/acessibilidade.spec.ts (SC-013, FR-052): `@axe-core/playwright` com tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` em configuração (cada passo), senha, recuperação e as três abas do painel; só a regra `color-contrast` em `mundo`, `jogo`, `historia`, `encerramento` e `bloqueio`; zero violações
- [ ] T113 Corrigir as violações apontadas por T110–T112 nos componentes de src/ui/ e em src/app/globals.css (alvos, espaçamento, contraste, rótulos) até as três suítes passarem
- [ ] T114 Revisar src/ inteiro contra FR-050 e o Princípio IV: sem links externos, compras, anúncios, pontos, sequências, reprodução automática infinita ou convites a continuar; nenhuma animação com período < 1 s ou alternância de brilho; nenhum `Math.random`; nenhuma URL externa
- [ ] T115 Rodar `npm run verify` até `VERIFY OK: 5/5 etapas` (tipos, padrões, testes com cobertura, build, e2e) e conferir cobertura ≥ 80% nas linhas novas de src/ (SHOULD)
- [ ] T116 Executar os Cenários 4, 5 e 6 de [quickstart.md](quickstart.md) (uso manual no celular, offline e instalação, privacidade no DevTools com a verificação de vozes locais) e registrar as observações em docs/metricas/observacoes.md
- [ ] T117 Rodar `npm run sonar -- --etapa implement` com o SonarQube local da 001 e confirmar o Quality Gate `TCC` aprovado nos escopos `app` e `scripts` (bugs 0, vulnerabilidades 0, hotspots revisados 100%, duplicação ≤ 3%, ciclomática ≤ 10, cognitiva ≤ 15, manutenibilidade A, sem Blocker/Critical); o snapshot é anexado a specs/002-parental-screen-time/metricas-ia.md (Princípio VI)
- [ ] T119 Marcar o critério de conclusão de [quickstart.md](quickstart.md) item a item, exceto o item de métricas de IA em `metricas-ia.md`, que é marcado ao fim da T118 (Phase 12)

---

## Phase 12: Registro de métricas de IA (pós-implement)

**Purpose**: cumprir o Princípio VI registrando as métricas de IA de todas as etapas da feature 002.

**⚠️ NÃO executar durante o `/speckit-implement`**: esta fase roda numa sessão de registro separada,
depois de encerrada a sessão de implementação, para que os tokens e o custo do `implement` estejam
completos na fonte verificável.

- [ ] T118 Em sessão de registro posterior ao `implement`, registrar em specs/002-parental-screen-time/metricas-ia.md uma linha por etapa da feature 002 — `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement` e cada `correcao-N` que tiver ocorrido — com `npm run metrics:ia -- --etapa <etapa> --sessao <id>`; quando a fonte não separar etapas da mesma sessão, registrar uma única linha agregada identificando explicitamente as etapas incluídas (por exemplo, "plan + tasks"), sem ratear nem estimar valores entre elas (Princípio VI); validar com `npm run metrics:check`, atualizar docs/metricas/consolidado.md com `npm run metrics:consolidar` e então marcar o item de métricas do critério de conclusão do [quickstart.md](quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup (T003 para os `*.test.ts`); bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Foundational. É o MVP e o destino comum (`World` mínimo, T048).
- **US2 (Phase 4)**: depende da Foundational e de T048 (completa o `World`).
- **US3 (Phase 5)**: depende da Foundational; os E2E dependem de US1 + US2 para chegar ao fim do tempo.
- **US4 (Phase 6)**: depende da Foundational e de T045 (PinPad) e T043 (credencial) da US1.
- **US5 (Phase 7)**: depende da US4 (casca do painel, T081) e de T069 (closure) da US3.
- **US6 (Phase 8)**: depende da US4 (casca do painel); T093 depois de T085 (mesmo arquivo).
- **US7 (Phase 9)**: depende da Foundational e de T063 (montagem provisória substituída).
- **US8 (Phase 10)**: depende de T071 (Story, US3) e T063; T106 depois de T101 (mesmo arquivo).
- **Polish (Phase 11)**: depende das histórias desejadas concluídas.
- **Registro de métricas (Phase 12)**: depende do fim do `implement` (Polish concluído); roda em
  sessão de registro separada, fora do `/speckit-implement`.

### User Story Dependencies

```text
Setup → Foundational ─┬─ US1 (P1) ─┬─ US2 (P1) ─┬─ US7 (P3)
                      │            │            └─ US8 (P3) ← T071 (US3)
                      │            ├─ US3 (P1)
                      │            └─ US4 (P2) ─┬─ US5 (P2) ← T069 (US3)
                      │                         └─ US6 (P3)
                      └──────────────────────────────────────── Polish
```

### Within Each User Story

- Testes escritos e falhando antes da implementação.
- Conteúdo e domínio puro → plataforma → componentes → ligação em `src/ui/App.tsx`.
- `src/ui/App.tsx` é editado por T036, T047, T048, T063, T074, T082, T090, T105 e T107: essas tarefas
  são sempre sequenciais entre si.

### Parallel Opportunities

- Setup: T002, T003, T004, T005 em paralelo.
- Foundational: todos os testes T011–T021 em paralelo; depois T022, T023, T028, T029, T030, T032,
  T033 em paralelo.
- Cada história: todos os testes marcados [P] em paralelo; domínio, conteúdo e componentes
  compartilhados marcados [P] em paralelo.
- Com mais de uma pessoa, após a US1: US2, US3 e US4 podem andar em paralelo (exceto as edições
  sequenciais de `src/ui/App.tsx`); depois US5/US6 e US7/US8.

---

## Parallel Example: User Story 2

```bash
# Testes da US2, juntos:
Task: "T049 tests/unit/app/domain/counting.test.ts"
Task: "T050 tests/unit/app/domain/progress.test.ts"
Task: "T051 tests/unit/app/platform/counter-lock.test.ts e visibility.test.ts"
Task: "T052 tests/unit/app/ui/useTimeCounter.test.tsx e useDayRollover.test.tsx"
Task: "T053 tests/unit/app/ui/child/World.test.tsx"
Task: "T054 tests/e2e/contagem.spec.ts"
Task: "T055 tests/e2e/supervisao.spec.ts"

# Implementação independente da US2, junta:
Task: "T056 src/domain/counting.ts"
Task: "T057 src/domain/progress.ts"
Task: "T058 src/platform/counter-lock.ts e visibility.ts"
Task: "T059 src/content/phrases.ts"
Task: "T061 src/ui/shared/Sky.tsx e Fireflies.tsx"
```

## Parallel Example: User Story 6

```bash
Task: "T091 tests/unit/app/domain/history.test.ts"
Task: "T092 tests/unit/app/domain/export.test.ts"
Task: "T094 src/domain/history.ts"
Task: "T095 src/domain/export.ts"
Task: "T096 src/platform/download.ts"
Task: "T097 src/ui/shared/BarChart.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) e Phase 2 (Foundational).
2. Phase 3 (US1): configuração com consentimento até o mundo da criança.
3. **Parar e validar**: `npx vitest run` e `npx playwright test configuracao`.

### Produto mínimo que cumpre a SBP (US1 + US2 + US3)

As três histórias P1 juntas entregam o controle: configurar, contar o tempo e encerrar com bloqueio.
É o primeiro ponto em que `npm run verify` deve passar inteiro.

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → MVP de configuração.
3. US2 → contagem e mundo da criança.
4. US3 → encerramento e bloqueio (produto mínimo).
5. US4 → área do adulto protegida.
6. US5 → Hoje e Ajustes.
7. US6 → Registro e exportação.
8. US7 e US8 → jogo e história.
9. Polish → ícones, offline, toque, acessibilidade, `verify` e SonarQube (snapshot).
10. Registro de métricas de IA (Phase 12) → sessão separada, após o `implement`.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- O rótulo [USn] liga a tarefa à história da spec para rastreabilidade.
- Fazer commit após cada tarefa ou grupo lógico.
- Toda nova interação com o agente para corrigir falha de portão conta como rodada de correção
  (Constituição, Fluxo › item 4) e entra numa etapa `correcao-N` em `metricas-ia.md`.
