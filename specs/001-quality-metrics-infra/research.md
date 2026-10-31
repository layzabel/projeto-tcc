# Research — Infraestrutura de Qualidade e Métricas

**Feature**: `001-quality-metrics-infra` | **Data**: 2026-10-31

Cada decisão segue o formato Decisão / Justificativa / Alternativas consideradas. Não restam itens
"NEEDS CLARIFICATION" no Technical Context do [plan.md](plan.md).

---

## R1. Framework e execução de TypeScript nos scripts

- **Decisão**: Next.js 16.x (App Router, `output: 'export'`), React 19, TypeScript 5.x com
  `strict: true`. Os scripts de automação (`scripts/`) também são TypeScript e rodam direto no
  Node.js 24 via *type stripping* nativo (`node scripts/verify/verify.ts`), com um
  `scripts/tsconfig.json` próprio (`noEmit`, `erasableSyntaxOnly`, `allowImportingTsExtensions`,
  `module: nodenext`).
- **Justificativa**: stack fixada pela constituição. Rodar `.ts` nativamente evita uma dependência
  extra (`tsx`/`ts-node`) e coloca os scripts sob a mesma verificação de tipos, padrões e testes do
  app, como pede a spec ("Os scripts de automação também passam pelo comando único").
- **Alternativas**: scripts em `.mjs` com JSDoc (verificação de tipos mais fraca); `tsx` como
  dependência (desnecessária no Node 24).

## R2. Verificação de tipos

- **Decisão**: `tsc --noEmit` em dois projetos: `tsconfig.json` (app + testes) e
  `scripts/tsconfig.json` (scripts). `noUncheckedIndexedAccess` ativo; `any` explícito barrado por
  `@typescript-eslint/no-explicit-any` (erro).
- **Justificativa**: ferramenta padrão; o `next build` também checa tipos, mas a etapa separada
  permite à saída do comando único apontar "tipos" como a etapa que falhou (FR-002).
- **Alternativas**: depender só do `next build` (mistura falhas de tipo com falhas de geração).

## R3. Padrões de código e limites de complexidade

- **Decisão**: ESLint 9 (flat config, `eslint.config.mjs`) com `eslint-config-next`
  (core-web-vitals + typescript), `eslint-plugin-sonarjs` e `eslint-config-prettier`; Prettier com
  `prettier --check`. Limites:
  - `complexity: ["error", 10]` (regra nativa do ESLint, ciclomática) — sinaliza a partir de 11;
  - `sonarjs/cognitive-complexity: ["error", 15]` — sinaliza a partir de 16; é a mesma
    implementação da regra S3776 do SonarQube, o que mantém o ESLint e o servidor coerentes.
  - Execução com `--max-warnings=0`. A saída padrão do ESLint traz arquivo, linha e o nome da
    função na mensagem (ex.: `Function 'f' has a complexity of 11. Maximum allowed is 10`).
- **Justificativa**: ferramentas padrão do ecossistema Next.js. Next 16 removeu `next lint`; usa-se
  o CLI `eslint` diretamente.
- **Alternativas**: Biome (fora do padrão Next e sem regra cognitiva equivalente à do Sonar).

## R4. Testes e cobertura

- **Decisão**: Vitest 3.x + `@vitest/coverage-v8`, ambiente `jsdom` para componentes (com
  `@testing-library/react`) e `node` para scripts. Reporters de cobertura: `text` e `html`
  (legível por pessoas, `coverage/index.html`) e `lcov` (`coverage/lcov.info`, importado pelo
  SonarQube). Nenhum `thresholds` configurado (clarificação: cobertura não faz o comando falhar).
- **Justificativa**: Vitest é o executor recomendado na documentação do Next.js para testes
  unitários; V8 dispensa instrumentação.
- **Alternativas**: Jest (`next/jest`) — mais lento e com configuração ESM mais frágil no Windows.
- **E2E (Playwright)**: adiado; esta feature não tem fluxo do responsável nem bloqueio a testar
  (ver Complexity Tracking no plano).

## R5. Comando único (`npm run verify`)

- **Decisão**: orquestrador em TypeScript (`scripts/verify/verify.ts`) que executa em sequência as
  etapas `tipos` → `padroes` → `testes` → `build`, para na primeira falha, imprime
  `VERIFY FALHOU: etapa=<nome>` e sai com código próprio da etapa (1–4). A lógica de sequência é
  uma função pura `runStages(stages, exec)` testada com execuções simuladas (SC-002); a injeção real
  de falhas fica no checklist do [quickstart.md](quickstart.md).
- **Justificativa**: `a && b && c` no npm não identifica a etapa e se comporta diferente entre
  shells no Windows; um orquestrador explícito torna a saída e o código de saída um contrato
  testável ([contracts/cli.md](contracts/cli.md)).
- **Alternativas**: `npm-run-all` (dependência extra, sem identificação de etapa no código de
  saída); executar `verify` real dentro do Vitest (recursão — o próprio `verify` roda o Vitest).

## R6. Testes dos limites de complexidade (SC-003)

- **Decisão**: fixtures em `tests/fixtures/complexity/` (ciclomática 10 e 11, cognitiva 15 e 16),
  ignoradas pelo lint normal e pelo Sonar, e um teste que usa a API Node do ESLint
  (`new ESLint({ overrideConfigFile: 'eslint.config.mjs', ignore: false })`) para lintar cada fixture
  e verificar quais são sinalizadas.
- **Justificativa**: testa a configuração real do projeto, não uma cópia.
- **Alternativas**: testar só via checklist manual (não automatizado).

## R7. SonarQube local e dois escopos

- **Decisão**:
  - Servidor: imagem oficial `sonarqube:community` via `docker-compose.yml` na raiz, porta 9000,
    banco embutido H2 (aceitável para uso local de avaliação), volumes nomeados para dados e
    extensões, telemetria do servidor desligada (`SONAR_TELEMETRY_ENABLE=false`).
  - Escopos: a edição Community não tem branches/aplicações, então cada escopo é **um projeto
    Sonar próprio**: `tcc-controle-parental-app` (`sonar.sources=src`) e
    `tcc-controle-parental-scripts` (`sonar.sources=scripts`), com arquivos de propriedades
    `sonar-project.app.properties` e `sonar-project.scripts.properties`. Isso garante que nenhuma
    métrica de um escopo entre no outro (FR-007).
  - Exclusões comuns: `**/node_modules/**`, `**/*.test.*`, `**/*.spec.*`, `tests/**`, `.next/**`,
    `out/**`, `coverage/**`, `specs/**`, `.specify/**`, `docs/**`, `**/*.d.ts`.
  - Cobertura: ambos apontam para `coverage/lcov.info`; cada projeto só considera os arquivos das
    próprias `sonar.sources`.
  - Scanner: `@sonar/scan` (scanner oficial distribuído via npm) como devDependency; o JRE é
    provisionado pelo próprio servidor. `sonar.qualitygate.wait=true` faz o scanner aguardar o
    processamento (FR-006).
  - Token: lido de `SONAR_TOKEN` (o scanner já reconhece a variável); nunca passado em argumento de
    linha de comando nem gravado.
- **Justificativa**: separação física dos escopos é a forma mais simples e auditável na edição
  Community; o scanner npm evita instalar Java manualmente.
- **Alternativas**: um único projeto com filtro por diretório na leitura das métricas (duplicação e
  dívida não são separáveis por diretório na API); `sonarsource/sonar-scanner-cli` em Docker
  (exige mapear o diretório e a rede do container no Windows).

## R8. Quality Gate e perfil de qualidade (Princípio V)

- **Decisão**: `npm run sonar:setup` (idempotente, via Web API com `SONAR_TOKEN` de administrador)
  cria:
  - perfil `TCC TypeScript` herdando de "Sonar way" com S3776 (cognitiva) limite 15 e S1541
    (ciclomática por função) ativada com limite 10, ambas severidade Critical — assim um excesso
    reprova o gate via `critical_violations`;
  - Quality Gate `TCC` em *Overall Code*: `bugs > 0`, `vulnerabilities > 0`,
    `security_hotspots_reviewed < 100`, `duplicated_lines_density > 3`, `sqale_rating > 1` (A),
    `blocker_violations > 0`, `critical_violations > 0`;
  - associação do perfil e do gate aos dois projetos.
- **Justificativa**: transcreve os mínimos da constituição; condições sobre *Overall Code* em vez
  de *New Code* porque cada feature precisa da foto completa.
- **Alternativas**: configuração manual na interface (não reproduzível pelo agente).

## R9. Leitura das métricas SonarQube

- **Decisão**: após o scanner, o agente lê do servidor:
  - `api/measures/component` com `bugs, vulnerabilities, code_smells, duplicated_lines_density,
    complexity, cognitive_complexity, sqale_index, sqale_rating, coverage`;
  - `api/qualitygates/project_status` (situação do gate);
  - `api/ce/task` (ID da análise, a partir do `ceTaskId` em `.scannerwork/report-task.txt`);
  - `api/measures/component_tree?qualifiers=FIL` (lista de arquivos analisados, para a verificação
    de escopo SC-004).
  - **Máximo por função**: o SonarQube não expõe métrica de complexidade máxima por função. O valor
    é calculado pelo agente com o ESLint sobre os mesmos arquivos do escopo, usando as regras
    `complexity` e `sonarjs/cognitive-complexity` com limite 0 (cada função é reportada com seu
    valor) e tomando o maior. A linha registra a origem (`eslint`) dessa coluna.
- **Justificativa**: FR-015 (valores lidos, não transcritos); a regra cognitiva do
  `eslint-plugin-sonarjs` é a mesma do servidor, então o máximo é coerente.
- **Alternativas**: extrair o valor das mensagens de issue S3776/S1541 (só existe quando o limite
  é excedido); deixar a coluna vazia (viola o Princípio V).

## R10. ccusage como fonte de tokens e custo

- **Decisão**: `npx -y ccusage@20.0.46 session --json --offline --id <sessão>` (versão fixada no
  código; validado em 2026-10-31). Campos usados por sessão: `period` (ID da sessão),
  `inputTokens`, `outputTokens`, `cacheCreationTokens`, `cacheReadTokens`, `totalCost`,
  `modelsUsed`, `metadata.lastActivity`. Custo gravado com a precisão completa devolvida no JSON.
  `--offline` usa a tabela de preços embutida na versão fixada, de modo que a mesma sessão sempre
  gera o mesmo custo — requisito para a conferência automatizada (SC-005).
- **Justificativa**: ccusage lê as transcrições locais do Claude Code, fonte verificável aceita
  pelo Princípio VI.
- **Alternativas**: `ccusage@latest` online (o custo de uma sessão antiga pode mudar com a tabela
  de preços e quebrar a conferência); `/cost` (não tem saída estruturada nem histórico).

## R11. Momento do registro de uma etapa

- **Decisão**: a linha de IA de uma etapa é gravada **depois que a sessão da etapa termina**, como
  primeira ação da sessão seguinte (ou numa sessão curta de registro), informando o ID da sessão
  encerrada. O script recusa registrar a sessão ativa (a transcrição modificada mais recentemente
  no diretório do projeto).
- **Justificativa**: se a etapa se registrasse dentro da própria sessão, os tokens gastos depois do
  registro ficariam de fora e o total no ccusage mudaria, tornando impossível o SC-005 ("idênticos
  ao relatório"). Os tokens do próprio registro ficam na sessão da etapa seguinte e são contados
  nela, sem perda nem dupla contagem.
- **Alternativas**: registrar no fim da própria sessão (valor incompleto e não conferível);
  registrar e depois corrigir a linha (viola FR-016).

## R12. Contagem de prompts

- **Decisão**: o número de prompts é lido da transcrição
  `%USERPROFILE%\.claude\projects\<slug-do-projeto>\<sessão>.jsonl`: conta as entradas com
  `type: "user"` cujo conteúdo é texto digitado pelo usuário, excluindo `tool_result`, entradas
  `isMeta: true`, saídas de comandos locais (`<local-command-stdout>`, `<local-command-caveat>`) e
  mensagens sintéticas de compactação. A invocação de um comando `/speckit-*` com argumentos conta
  como 1 prompt.
- **Justificativa**: FR-013 ("obtida do registro da sessão") e definição de prompt do Princípio VI.
- **Alternativas**: contar manualmente (não auditável).

## R13. Rodadas de correção

- **Decisão**: informadas pelo agente como argumento (`--correcoes N`), aplicando a definição do
  Princípio VI aos prompts da sessão; o script exibe os prompts contados para o agente classificar.
  Em sessões `correcao-N` o valor é ≥ 1.
- **Justificativa**: classificar a intenção de um prompt não é mecanizável com segurança; o número
  de prompts (dado objetivo) continua extraído automaticamente.
- **Alternativas**: heurística por palavras-chave ("corrija", "erro") — frágil e não auditável.

## R14. Gravação somente-acréscimo e resistente a interrupção

- **Decisão**: o arquivo `metricas-ia.md` tem duas tabelas Markdown em seções fixas. Para acrescentar
  uma linha, o script: (1) lê o arquivo; (2) insere a linha após a última linha da tabela alvo;
  (3) confere que as linhas antigas são exatamente as novas sem a linha inserida, na mesma ordem;
  (4) grava em `metricas-ia.md.tmp` no mesmo diretório e (5) renomeia sobre o original
  (`fs.renameSync`, substituição atômica no NTFS). Se o arquivo não existe, é criado a partir do
  cabeçalho do contrato.
- **Justificativa**: interrupção em qualquer ponto deixa o arquivo antigo intacto ou o novo
  completo — nunca linha parcial (edge case da spec). A conferência (3) implementa FR-016 em tempo
  de execução, além do teste SC-006.
- **Alternativas**: `fs.appendFile` (só funciona para a última tabela do arquivo e pode deixar linha
  parcial); dois arquivos separados (contraria FR-010).

## R15. Verificação de segredos (SC-008)

- **Decisão**: teste Vitest `secrets.test.ts` que percorre `git ls-files` e os arquivos
  `specs/*/metricas-ia.md` procurando (a) o valor atual de `SONAR_TOKEN`, quando definido, e (b) o
  padrão de tokens SonarQube `sq[apu]_[0-9a-f]{40}`. `.env*` e `.scannerwork/` entram no
  `.gitignore`. Os scripts nunca imprimem o token (mensagens mostram apenas "SONAR_TOKEN definido:
  sim/não").
- **Justificativa**: roda dentro da etapa de testes do comando único, sem dependência extra.
- **Alternativas**: gitleaks (binário extra no Windows).

## R16. Esqueleto do app e privacidade

- **Decisão**: apenas `src/app/layout.tsx` e `src/app/page.tsx` com uma página "Em construção" em
  pt-BR, sem `next/font/google` (busca fontes na rede no build), sem imagens remotas. CSP via
  `<meta http-equiv="Content-Security-Policy">` no layout com `default-src 'self'; connect-src
  'self'` (exportação estática não define cabeçalhos HTTP). Um teste de componente renderiza a
  página.
- **Justificativa**: FR-019 (esqueleto mínimo) e Princípio II desde o primeiro commit.
- **Alternativas**: página padrão do `create-next-app` (usa fontes do Google e imagens; teria de ser
  removida).

## R17. Consolidado do projeto

- **Decisão**: `npm run metrics:consolidar` lê todos os `specs/*/metricas-ia.md` e **regenera**
  `docs/metricas/consolidado.md` (arquivo derivado, não somente-acréscimo): soma das colunas de IA
  por feature e total geral; última linha SonarQube de cada escopo de cada feature, em seções
  separadas "Escopo app — base da comparação com o braço de vibe coding" e "Escopo scripts — dado
  complementar".
- **Justificativa**: FR-018; o consolidado é reproduzível a partir das fontes.
- **Alternativas**: atualização manual (não auditável).

## R18. Registro retroativo (FR-020)

- **Decisão**: `npm run metrics:ia -- --etapa <etapas> --sessao <id> --retroativo` para cada sessão
  histórica. Quando uma sessão abrigou várias etapas (ex.: `constitution+specify`), é gravada uma
  linha só, com as etapas unidas por `+` e o valor de tipo `retroativo`, sem dividir valores. Uma
  etapa espalhada em várias sessões usa `--sessao id1,id2` e a linha guarda a soma e todos os IDs.
- **Justificativa**: regras dos edge cases da spec.
