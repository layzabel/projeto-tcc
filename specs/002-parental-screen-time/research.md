# Research — Aplicação de Controle Parental de Tempo de Tela

**Feature**: `002-parental-screen-time` | **Data**: 2026-11-01

Cada decisão segue o formato Decisão / Justificativa / Alternativas consideradas. Não restam itens
"NEEDS CLARIFICATION" no Technical Context do [plan.md](plan.md). Tudo o que já existe da
`001-quality-metrics-infra` (comando `verify`, Vitest, ESLint/Prettier, SonarQube, service worker,
manifest, registro de métricas) é **reutilizado como está**; as decisões abaixo só acrescentam o
que esta feature precisa.

---

## R1. Uma única rota com telas derivadas do estado

- **Decisão**: a aplicação continua com uma única página (`src/app/page.tsx` → `out/index.html`),
  que monta o componente cliente `<App/>`. A tela exibida não vem da URL: é calculada por uma
  função pura `deriveScreen(estado)` (configuração → mundo da criança/jogo/história →
  encerramento → bloqueio), e a área do adulto é uma camada por cima. Ver
  [contracts/screens.md](contracts/screens.md).
- **Justificativa**: FR-001, FR-026 e FR-033 exigem que a tela seja sempre coerente com o estado
  gravado; com rotas, a criança (ou uma recarga) poderia abrir `/jogo` direto e pular o bloqueio.
  Uma página só também mantém a lista de cache do service worker da 001 trivial e evita depender
  de *rewrites*, que o site estático não tem.
- **Alternativas**: rotas do App Router por tela com guardas no cliente (cada rota precisaria
  repetir a guarda e haveria um quadro renderizado antes do redirecionamento); hash routing
  (mesmo problema, sem ganho).

## R2. Renderização estática e hidratação

- **Decisão**: `<App/>` é `'use client'`. No `next build`, a página é pré-renderizada com uma tela
  neutra de carregamento; o estado só é lido do armazenamento num efeito após a montagem
  (`useSyncExternalStore` com `getServerSnapshot` retornando "carregando").
- **Justificativa**: `localStorage` não existe na pré-renderização; o snapshot de servidor evita
  erro de hidratação e nunca mostra uma tela infantil antes de saber se a configuração foi
  concluída (SC-001).
- **Alternativas**: `dynamic(..., { ssr: false })` (funciona, mas esconde o motivo e dificulta o
  teste do estado "carregando").

## R3. Persistência: um documento JSON em `localStorage`

- **Decisão**: todos os dados ficam num único documento JSON versionado na chave
  `tcc-cp:v1` do `localStorage`, acessado só pela camada de repositório `src/storage/`
  (`load`, `update(fn)`, `clear`). `update` relê o documento atual, aplica a função, valida e grava
  de uma vez. Esquema e saneamento em [contracts/storage-schema.md](contracts/storage-schema.md).
- **Justificativa**:
  - FR-014 exige gravar ao ocultar a aplicação; em `pagehide`/`visibilitychange` o navegador pode
    encerrar a página antes de uma transação assíncrona do IndexedDB terminar, mas a escrita
    síncrona do `localStorage` termina antes do retorno.
  - O volume é mínimo: consentimento, ajustes, credencial, dia atual e até 30 registros de
    histórico cabem em menos de 8 KB.
  - Um único `setItem` por alteração é atômico do ponto de vista da página: não há estado
    parcialmente gravado entre consentimento, ajustes e dia.
  - O evento `storage` avisa as outras abas de cada gravação (R6) sem mecanismo extra.
  - Testável no `jsdom` do Vitest sem dependência nova (o IndexedDB exigiria `fake-indexeddb`).
- **Desvio registrado**: a constituição diz "IndexedDB preferencial; `localStorage` para
  configurações pequenas". O uso de `localStorage` também para o histórico está justificado no
  Complexity Tracking do plano.
- **Alternativas**: IndexedDB (assíncrono, risco em `pagehide`, dependência nova para testes);
  IndexedDB com espelho em `localStorage` (dois armazenamentos para manter coerentes).

## R4. Contagem do tempo com relógio monotônico

- **Decisão**: um *ticker* de 1 s (`setInterval`) só fica ativo enquanto as três condições de
  FR-011 valem (tela infantil de uso, documento visível, tempo disponível). A cada tick:
  `delta = clamp(performance.now() − último, 0, 5000 ms)`; o delta soma num acumulador em memória.
  O acumulador é transferido para `currentDay.usedSeconds` (inteiro, nunca decrescente:
  `max(gravado, novo)`) e gravado a cada 5 s de contagem, ao sair de uma tela infantil, em
  `visibilitychange → hidden` e em `pagehide`. Ao reativar o tick (volta do segundo plano ou da
  área do adulto), `último` é reiniciado, então o tempo oculto não entra.
- **Justificativa**: `performance.now()` não volta para trás e não segue ajustes do relógio do
  aparelho (FR-013); o teto de 5 s por intervalo absorve suspensão do aparelho, travamentos e
  ticks atrasados por *throttling* (SC-002, SC-003). Ticks de 1 s tornam a passagem dos limiares
  (aviso, vaga-lumes, fim) visível com no máximo 1 s de atraso; a gravação a cada 5 s limita a
  perda após fechamento a 5 s (FR-014, SC-004).
- **Alternativas**: diferença de `Date.now()` entre gravações (sensível a saltos do relógio);
  `requestAnimationFrame` (para em segundo plano, mas roda a 60 Hz sem necessidade).

## R5. Data local e virada do dia

- **Decisão**: a data do dia é `YYYY-MM-DD` calculada de `new Date()` com os componentes locais
  (`getFullYear/getMonth/getDate`), no fuso do aparelho. A cada tick, a cada volta à visibilidade,
  na carga e por um temporizador de 30 s que roda mesmo fora das telas infantis (para liberar o
  bloqueio com a aplicação aberta, FR-029), a função pura `rollover(doc, hoje)` decide:
  - `hoje > currentDay.date`: arquiva o dia atual no histórico, cria o novo dia com
    `usedSeconds = 0`, `limitMin = settings.dailyLimitMin` e flags zeradas, e aplica a retenção;
  - `hoje ≤ currentDay.date`: nada muda (FR-019).
  Comparação de datas por string ISO (ordem lexicográfica = cronológica).
- **Justificativa**: só a **data** usa o relógio de parede, que é o que define "meia-noite no fuso
  do aparelho"; a **duração** nunca usa (R4). Adiantar a data do aparelho vira o dia: é a premissa
  aceita na spec (Assumptions, "Teto por intervalo"). No SC-003, o salto de +24 h arquiva o dia com
  o mesmo `usedSeconds` (alteração ≤ 5 s) e o novo dia começa em zero dentro do limite normal.
- **Alternativas**: `Intl.DateTimeFormat` com `timeZone` explícito (desnecessário, o fuso do
  aparelho é o padrão); agendar um `setTimeout` exato para a meia-noite (falha com relógio
  alterado ou aparelho suspenso; o temporizador de 30 s é mais robusto).

## R6. Várias abas ou janelas (FR-020)

- **Decisão**: só conta a aba que detém o *Web Lock* exclusivo `tcc-cp-contagem`
  (`navigator.locks.request`). A aba pede a trava quando as condições de contagem passam a valer e
  a solta quando deixam de valer; as demais esperam. Todas as abas assinam o evento `storage` e
  recarregam o documento quando outra aba grava, então a tela de todas reflete tempo, encerramento
  e bloqueio. Se `navigator.locks` não existir, a aba conta normalmente (degradação documentada:
  todos os navegadores-alvo têm a API).
- **Justificativa**: a trava é liberada pelo navegador se a aba fechar ou travar, sem lógica de
  expiração própria; combinada com `usedSeconds = max(...)` e a releitura em `update` (R3), não há
  contagem em dobro nem regressão.
- **Alternativas**: `BroadcastChannel` com eleição de líder própria (mais código e casos de
  corrida); "lease" com carimbo de tempo no armazenamento (depende do relógio de parede).

## R7. Encerramento como sequência cancelável

- **Decisão**: o encerramento é uma lista de etapas derivada do estilo
  (`closureSteps(estilo)` → `aviso, [respiracao×3 | historia | —], elogio, escolha, despedida`).
  Cada execução recebe um `AbortController`; temporizadores, falas (`speechSynthesis.cancel()`) e
  sons usam o `signal` e são descartados quando ele aborta. Ao montar a tela de encerramento
  (recarga, volta da área do adulto), a execução anterior é abortada e uma nova começa do
  início (FR-028, SC-006). O fim da despedida grava `closure = 'concluido'`, e a tela passa a ser
  o bloqueio.
- **Justificativa**: `AbortSignal` é nativo e permite testar com temporizadores falsos que nenhuma
  etapa antiga dispara depois do reinício.
- **Alternativas**: contador de "época" comparado em cada callback (mesmo efeito, mais fácil de
  esquecer um ponto); máquina de estados com biblioteca (dependência sem necessidade).

## R8. Senha (credencial do adulto)

- **Decisão**: PBKDF2-SHA-256 pela Web Crypto (`crypto.subtle.deriveBits`), sal aleatório de 16
  bytes (`crypto.getRandomValues`), 210 000 iterações, resultado de 32 bytes; guardados em base64
  com o algoritmo e as iterações. A verificação recalcula e compara em tempo constante sobre os
  bytes. A senha digitada nunca é gravada nem registrada em log.
- **Justificativa**: atende FR-043 (forma não reversível, nunca legível) sem dependência. Com 4
  dígitos a força real é baixa e está assumida na spec (a senha protege contra a criança, sem
  bloqueio por tentativas); o custo de derivação só impede a leitura direta do valor. A Web Crypto
  exige contexto seguro, que já é condição do service worker (HTTPS ou `localhost`).
- **Alternativas**: SHA-256 simples (rápido demais e sem custo); bcrypt/argon2 em JS (dependência
  nova).

## R9. Aleatoriedade

- **Decisão**: sorteios (ordem e cores dos brinquedos, frase do mascote, contas de recuperação)
  usam uma função `random(): number` injetável baseada em `crypto.getRandomValues`. Os testes
  injetam uma sequência fixa.
- **Justificativa**: `Math.random` gera *Security Hotspot* no SonarQube (S2245), e o Quality Gate
  exige 100% dos hotspots revisados; usar a fonte criptográfica evita o hotspot. A injeção torna
  o jogo e a recuperação determinísticos nos testes.
- **Alternativas**: `Math.random` com hotspot marcado como seguro (exige revisão manual a cada
  análise).

## R10. Sons sem arquivos

- **Decisão**: todos os sons (aviso de "falta pouco", fim de tempo, acerto, reações e efeitos da
  história) são sintetizados com a Web Audio API (`OscillatorNode` + `GainNode`, envelopes curtos).
  Um único `AudioContext` é criado e retomado (`resume()`) no primeiro `pointerdown`; sons
  obrigatórios pedidos antes disso ficam numa fila de no máximo um item por tipo e tocam quando o
  contexto é desbloqueado. A classificação "obrigatório × efeito" de FR-037 fica numa tabela do
  serviço de som.
- **Justificativa**: nada a baixar ou licenciar, sem arquivos no cache, conteúdo original
  (Assumptions); cobre o caso do áudio bloqueado até a primeira interação (Edge Cases).
- **Alternativas**: arquivos `.mp3`/`.ogg` embarcados (licença e peso, sem ganho para tons
  simples); elemento `<audio>` (mesma restrição de autoplay).

## R11. Voz do mascote somente local

- **Decisão**: Web Speech API (`speechSynthesis`), usando apenas vozes com `lang` iniciando em
  `pt` **e** `localService === true`, de preferência `pt-BR`. Sem voz elegível, ou com voz
  desligada, a fala aparece só no balão. Cada fala nova cancela a anterior.
- **Justificativa**: algumas vozes de navegadores de computador são sintetizadas em servidores
  remotos (`localService === false`), o que enviaria o texto, inclusive o nome da criança, para
  fora do aparelho (FR-046, Princípio II). Filtrar por `localService` mantém a fala no aparelho,
  conforme a premissa "falas em voz alta usam recursos do próprio aparelho".
- **Alternativas**: áudios gravados das falas (impossível com o nome da criança); qualquer voz
  `pt-BR` (risco de envio remoto).

## R12. Exportação dos dados

- **Decisão**: arquivo JSON (UTF-8, indentado) gerado no aparelho a partir do documento salvo, sem
  o campo `credential`; baixado por `Blob` + `URL.createObjectURL` + `<a download>`. Nome
  `controle-parental-dados-AAAA-MM-DD.json`. Formato em
  [contracts/export-format.md](contracts/export-format.md).
- **Justificativa**: "formato estruturado e legível" (FR-041); JSON é o próprio formato do
  armazenamento, então a exportação é uma projeção sem perda. O download não faz requisição de
  rede, e a CSP `connect-src 'self'` continua valendo.
- **Alternativas**: CSV (não representa bem consentimento e ajustes aninhados); Web Share API
  (abre apps de terceiros, risco de envio).

## R13. Animações, movimento reduzido e flashes

- **Decisão**: ilustrações em SVG inline (componentes React); animações em CSS (`@keyframes`,
  `transition`). O atributo `data-motion="reduced"` no elemento raiz é ligado quando o ajuste
  "menos animação" está ativo **ou** `matchMedia('(prefers-reduced-motion: reduce)')` casa; o CSS
  troca então animações contínuas por estados finais e transições ≤ 150 ms (FR-038). Nenhuma
  animação tem período menor que 1 s nem alterna brilho, o que fica bem abaixo de 3 flashes/s
  (FR-050).
- **Justificativa**: sem dependência de animação; um único ponto de controle testável.
- **Alternativas**: biblioteca de animação (dependência, sem ganho para efeitos simples).

## R14. Botão "sou o adulto" (pressionar por 3 s)

- **Decisão**: componente com Pointer Events (`pointerdown` inicia; `pointerup`, `pointerleave` e
  `pointercancel` cancelam e zeram). O progresso é medido com `performance.now()` e desenhado num
  anel SVG a cada quadro; ao chegar a 3 000 ms, abre o teclado de senha. Para acessibilidade do
  adulto, segurar Espaço/Enter por 3 s tem o mesmo efeito. `touch-action: none` e
  `contextmenu` bloqueado evitam o menu de toque longo.
- **Justificativa**: FR-030; o mesmo relógio monotônico de R4 permite testar com relógio falso.
- **Alternativas**: evento `contextmenu`/toque longo nativo (duração varia por aparelho).

## R15. Painel do responsável: gráficos sem biblioteca

- **Decisão**: indicador circular (aba Hoje) e gráfico de 7 barras (aba Registro) em SVG próprio,
  cada um com rótulo acessível e uma tabela equivalente (visível ou `sr-only`) com os mesmos
  números. Os 7 dias e os 30 dias do histórico são derivados na hora da exibição, preenchendo com
  zero as datas sem registro (Edge Cases: dias sem uso como zero, sem inventar uso).
- **Justificativa**: só dois gráficos simples; uma biblioteca de gráficos aumentaria o pacote e as
  métricas do escopo `app` sem necessidade. A tabela equivalente cumpre WCAG 1.1.1/1.3.1 (FR-052).
- **Alternativas**: Recharts/Chart.js (dependência e possível uso de recursos externos).

## R16. Testes unitários e de componentes (reuso do Vitest da 001)

- **Decisão**: mesmo Vitest e mesma cobertura da 001. O projeto `app` passa a incluir também
  `tests/unit/app/**/*.test.ts` (hoje só `*.test.tsx`), para os testes da lógica de domínio e do
  repositório. Tempo controlado com `vi.useFakeTimers({ toFake: [..., 'performance', 'Date'] })` e
  pela injeção de um `Clock` (`monotonic()`, `now()`) nos serviços.
- **Justificativa**: FR-055 e Princípio III pedem testes da contagem, virada do dia, pausa,
  recarga e limite; deixá-los puros e com relógio injetado os torna determinísticos.
- **Alternativas**: um terceiro projeto Vitest `domain` (sem ganho; mesmo ambiente `jsdom`).

## R17. Testes de ponta a ponta com Playwright

- **Decisão**: `@playwright/test` (dev) com Chromium, rodando sobre o build estático `out/`
  servido por um servidor estático mínimo em Node (`scripts/e2e/serve-out.ts`, `node:http`, só
  `127.0.0.1`), em dois perfis de viewport (celular retrato 390×844 e desktop 1280×800, mais 320 px
  nas verificações de layout). Tempo controlado com `page.clock` (`install`, `runFor`,
  `fastForward`, `setSystemTime`), que controla `Date`, `performance.now` e temporizadores.
  Cada teste começa com armazenamento vazio ou com um documento preparado por `addInitScript`
  (ver [contracts/e2e.md](contracts/e2e.md)).
- **Justificativa**: o E2E foi adiado na 001 justamente para esta feature ("Playwright entra junto
  com o primeiro fluxo"). Servir o `out/` real testa o que é publicado, inclusive service worker e
  CSP; um servidor de ~40 linhas evita dependência nova.
- **Alternativas**: Cypress (não controla `performance.now` tão bem; mais pesado); `next start`
  (não serve `output: 'export'`); pacote `serve`/`http-server` (dependência para algo trivial).

## R18. Verificações automáticas de privacidade, acessibilidade e toque

- **Decisão**:
  - **Rede (SC-011)**: uma *fixture* do Playwright usada por **todos** os testes registra
    `context.on('request')` e falha o teste se alguma URL não for da origem `http://127.0.0.1:<porta>`
    (ou `blob:`/`data:`). Um teste dedicado carrega, espera o service worker ativar, liga
    `context.setOffline(true)`, recarrega e percorre configuração → mundo da criança → jogo.
  - **Acessibilidade (SC-013)**: `@axe-core/playwright` (dev) com as tags `wcag2a`, `wcag2aa`,
    `wcag21a`, `wcag21aa` nas telas do adulto e só a regra `color-contrast` nas telas infantis.
  - **Alvos de toque (SC-012)**: todo elemento interativo das telas infantis recebe o atributo
    `data-alvo-infantil`; o teste mede `boundingBox()` de cada um nas larguras 320, 390 e 1280 e
    verifica ≥ 64×64 e distância ≥ 8 px entre pares.
- **Justificativa**: transforma os portões da constituição (sem tráfego, toque ≥ 64 px, AA) em
  testes que rodam dentro do `verify`.
- **Alternativas**: conferência manual no DevTools (continua no checklist, mas não substitui o
  teste automático).

## R19. Extensão do comando único (`verify`) com a etapa `e2e`

- **Decisão**: a lista `STAGES` de `scripts/verify/stages.ts` ganha a 5ª etapa `e2e` (código de
  saída 5), depois de `build`, com o comando `npx playwright test`. A mensagem final passa a ser
  `VERIFY OK: 5/5 etapas`. O `verify.test.ts` da 001 é atualizado para as 5 etapas. Nada mais da
  infraestrutura muda. Contrato em [contracts/e2e.md](contracts/e2e.md).
- **Justificativa**: SC-014 exige que o comando único passe ao final, e FR-055 exige E2E; sem a
  etapa, os testes de ponta a ponta poderiam falhar sem que o `verify` acusasse. O E2E precisa do
  `out/`, por isso vem depois de `build`. É uma extensão de uma linha na tabela de etapas, não uma
  recriação.
- **Alternativas**: comando separado `npm run e2e` fora do `verify` (o portão poderia ser
  esquecido); rodar E2E dentro da etapa `testes` (o `out/` ainda não existe).

## R20. Ícones para instalação na tela inicial

- **Decisão**: manter o `src/app/manifest.ts` da 001 e acrescentar ícones PNG 192×192 e 512×512
  (`public/icons/`, também `purpose: "maskable"`) e `src/app/apple-icon.png` (180×180, convenção do
  Next para o iOS). Os PNG são desenhos originais simples, gerados uma única vez e versionados.
  O `title` do layout deixa de dizer "em construção".
- **Justificativa**: FR-047 ("pode ser adicionada à tela inicial"): o Safari do iOS não usa ícone
  SVG no atalho, e o Chrome no Android prefere PNG de 192 e 512 para instalar. Os arquivos ficam
  em `out/` e entram automaticamente na lista de cache do `generate-sw.ts` da 001.
- **Alternativas**: só o SVG atual (atalho sem ícone no iOS); gerar PNG no build (dependência de
  rasterização).

## R21. CSP

- **Decisão**: manter a CSP de `src/app/layout.tsx` (`connect-src 'self'`) e acrescentar
  `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` e `worker-src 'self'`.
- **Justificativa**: a 001 já garante o essencial do Princípio II; os acréscimos fecham vetores
  que esta feature não usa (formulários enviados, plugins, `<base>` injetado). `frame-ancestors`
  não funciona em `<meta>`, por isso não entra.
- **Alternativas**: remover `'unsafe-inline'` de `script-src` (o Next estático injeta scripts
  inline de hidratação; exigiria *hashes* gerados por build, fora do escopo).

## R22. Dependências novas

| Dependência | Tipo | Motivo | Rede/telemetria? |
|---|---|---|---|
| `@playwright/test` | dev | testes E2E exigidos pela constituição (R17) | Não em runtime do app. O download dos navegadores (`npx playwright install chromium`) acontece uma vez na máquina de desenvolvimento; o Playwright não tem telemetria |
| `@axe-core/playwright` | dev | verificação automática WCAG AA (R18) | Não; o axe roda localmente na página |

Nenhuma dependência de runtime nova: o app continua só com `next`, `react` e `react-dom`. Versões
exatas fixadas no `package.json` no momento da instalação, como nas demais.
