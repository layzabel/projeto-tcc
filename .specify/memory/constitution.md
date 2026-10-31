<!--
Sync Impact Report
- Version change: (template sem versão) → 1.0.0
- Princípios definidos (primeira ratificação; antes havia apenas placeholders):
  - [PRINCIPLE_1_NAME] → I. Proteção e Privacidade da Criança (LGPD art. 14)
  - [PRINCIPLE_2_NAME] → II. Dados Exclusivamente no Aparelho
  - [PRINCIPLE_3_NAME] → III. Limite Diário Alinhado à SBP
  - [PRINCIPLE_4_NAME] → IV. Interface Infantil sem Leitura e sem Manipulação
  - [PRINCIPLE_5_NAME] → V. Qualidade de Código Mensurável (SonarQube)
  - (novo) VI. Rastreabilidade do Desenvolvimento com IA
- Seções adicionadas:
  - Restrições Técnicas e de Conformidade (antes [SECTION_2_NAME])
  - Fluxo de Desenvolvimento e Portões de Qualidade (antes [SECTION_3_NAME])
  - Governança preenchida
- Seções removidas: nenhuma
- Templates dependentes: não modificados (leem a constituição em tempo de execução).
- TODOs adiados: nenhum placeholder pendente. Data de ratificação = data desta
  primeira adoção (2026-10-28).
-->

# Constituição — Controle Parental de Tempo de Tela (2 a 5 anos)

## Core Principles

### I. Proteção e Privacidade da Criança (LGPD art. 14) — INEGOCIÁVEL

- O tratamento de qualquer dado relativo à criança DEVE ocorrer no seu melhor interesse e
  somente após consentimento específico e em destaque de pelo menos um dos pais ou responsável
  legal (LGPD art. 14, §1º).
- O consentimento DEVE ser coletado na área do responsável antes do primeiro uso, registrar
  data/hora e versão do texto aceito, e poder ser revogado a qualquer momento; a revogação DEVE
  apagar todos os dados da criança do aparelho.
- O app DEVE coletar apenas o mínimo necessário (minimização): apelido ou ícone da criança,
  faixa etária, limites configurados e registros de uso. É PROIBIDO coletar nome completo, foto,
  voz, localização, identificadores do aparelho, contatos ou dados biométricos.
- As informações sobre quais dados são tratados e para quê DEVEM ser apresentadas ao responsável
  em linguagem simples e clara (LGPD art. 14, §§2º e 6º).
- O responsável DEVE poder visualizar, exportar (arquivo local) e excluir todos os dados a
  qualquer momento.
- A área do responsável DEVE ser protegida por um bloqueio adulto (PIN ou desafio não resolvível
  por criança de 2 a 5 anos) para impedir alterações pela criança.

**Justificativa**: o público são crianças pequenas, titulares de proteção reforçada pela LGPD;
privacidade é requisito legal, não funcionalidade opcional.

### II. Dados Exclusivamente no Aparelho

- Todos os dados DEVEM ser armazenados somente no navegador/aparelho do usuário (IndexedDB ou
  `localStorage`). Não existe servidor de aplicação, banco de dados remoto nem conta de usuário.
- É PROIBIDO enviar qualquer dado a terceiros ou à rede: sem analytics, telemetria, rastreadores,
  pixels, SDKs de anúncio, relatórios de erro remotos, fontes ou scripts carregados de CDN.
- O app DEVE ser publicável como site estático (Next.js `output: 'export'`); Route Handlers,
  Server Actions, API routes e qualquer código que dependa de servidor em tempo de execução são
  PROIBIDOS.
- Uma Content Security Policy DEVE restringir `connect-src` a `'self'` (ou `'none'`) de modo que
  nenhuma requisição de saída com dados seja possível.
- O app DEVE funcionar offline após o primeiro carregamento (service worker/PWA recomendado).

**Justificativa**: sem servidor e sem transmissão, o risco de vazamento e a superfície de ataque
ficam restritos ao aparelho, e a conformidade com a LGPD é verificável por inspeção.

### III. Limite Diário Alinhado à SBP

- O limite diário padrão e o limite máximo configurável DEVEM ser de 60 minutos por dia por
  criança, conforme recomendação da Sociedade Brasileira de Pediatria para a faixa de 2 a 5 anos.
  O responsável PODE configurar valores menores, nunca maiores.
- A contagem de tempo DEVE ser determinística, persistida localmente, resistente a recarga da
  página e reiniciada à meia-noite no fuso horário do aparelho.
- O app DEVE avisar a criança de forma visual e sonora (sem texto obrigatório) antes do fim do
  tempo e, ao atingir o limite, DEVE bloquear o uso infantil até o dia seguinte ou até liberação
  explícita do responsável via área protegida.
- O app DEVE incentivar supervisão e uso compartilhado com o responsável, e SHOULD permitir
  configurar períodos sem tela (por exemplo, antes de dormir e durante refeições).
- A lógica de contagem e limite DEVE ter testes automatizados cobrindo virada de dia, pausa,
  recarga e limite atingido.

**Justificativa**: o propósito central do produto é fazer cumprir a recomendação pediátrica;
um limite incorreto invalida o produto.

### IV. Interface Infantil sem Leitura e sem Manipulação

- A área infantil DEVE ser utilizável por uma criança que não sabe ler: comunicação por ícones,
  cores, imagens, animações curtas e áudio; nenhuma ação infantil pode depender de texto.
- Todo alvo de toque da área infantil DEVE medir no mínimo 64×64 px CSS, com espaçamento mínimo
  de 8 px entre alvos, em todas as larguras de tela suportadas.
- É PROIBIDO: anúncios, compras (inclusive in-app), links externos acessíveis pela criança,
  coleta de avaliações, notificações push e qualquer padrão de engajamento compulsivo
  (reprodução automática, rolagem infinita, sequências/streaks, recompensas aleatórias,
  contadores de pontos, pressão de tempo para continuar, "só mais um").
- O encerramento do tempo DEVE ser apresentado de forma calma e positiva, sem punição,
  culpabilização ou recompensa por usar mais tempo.
- A área do responsável DEVE atender WCAG 2.1 nível AA; a área infantil DEVE atender contraste
  mínimo AA e não usar flashes acima de 3 por segundo.
- O layout DEVE ser responsivo de 320 px de largura até desktop, em orientação retrato e
  paisagem.

**Justificativa**: crianças de 2 a 5 anos não leem, têm coordenação motora em desenvolvimento e
são vulneráveis a design persuasivo; a interface precisa proteger, não capturar atenção.

### V. Qualidade de Código Mensurável (SonarQube)

- Todo código DEVE ser analisado pelo SonarQube (Community Edition ou SonarCloud) antes de ser
  considerado concluído. O Quality Gate do projeto DEVE exigir, no mínimo:
  - Bugs: 0 · Vulnerabilidades: 0 · Security Hotspots revisados: 100%;
  - Duplicação de linhas: ≤ 3%;
  - Complexidade cognitiva por função: ≤ 15 (regra padrão Sonar);
  - Complexidade ciclomática por função: ≤ 10;
  - Nota de manutenibilidade (Maintainability Rating): A;
  - Code smells de severidade Blocker/Critical: 0.
- As seguintes métricas DEVEM ser registradas a cada análise: bugs, vulnerabilidades, code
  smells, duplicação (%), complexidade ciclomática (total e máxima por função), complexidade
  cognitiva (total e máxima por função), dívida técnica em minutos (`sqale_index`) e nota de
  manutenibilidade.
- TypeScript DEVE usar `strict: true`; `any` explícito é PROIBIDO sem justificativa registrada.
  ESLint e Prettier DEVEM passar sem erros.
- Exceções a um limite DEVEM ser justificadas por escrito na tabela "Complexity Tracking" do
  `plan.md` da feature.

**Justificativa**: o trabalho avalia a qualidade do código produzido com IA; sem métricas
objetivas e reproduzíveis não há base de comparação.

### VI. Rastreabilidade do Desenvolvimento com IA

- Cada feature DEVE manter o arquivo `specs/<feature>/metricas-ia.md` com uma linha por etapa do
  Spec Kit (constitution, specify, clarify, plan, tasks, analyze, implement, correções),
  contendo: data, modelo (ID exato), tokens de entrada, tokens de saída, tokens de cache
  (leitura/escrita), custo em USD, número de prompts do usuário e número de rodadas de correção.
- **Prompt** é cada mensagem enviada pelo usuário ao agente. **Rodada de correção** é cada
  prompt que pede ao agente para corrigir defeito, erro de build/teste, violação desta
  constituição ou apontamento do SonarQube em artefato já gerado.
- Tokens e custo DEVEM vir de fonte verificável (saída de `/cost` do Claude Code, painel de uso
  do provedor ou transcrições da sessão). Valores estimados DEVEM ser marcados como "estimado",
  com o método de estimativa indicado. É PROIBIDO inventar ou arredondar sem indicação.
- Ao final de `implement` e de cada rodada de correção, o agente DEVE anexar ao mesmo arquivo um
  snapshot das métricas SonarQube do Princípio V, permitindo correlacionar esforço de IA e
  qualidade.
- Um consolidado do projeto DEVE ser mantido em `docs/metricas/consolidado.md` somando as
  métricas de todas as features.

**Justificativa**: a rastreabilidade do custo e do esforço de desenvolvimento assistido por IA
é objeto de estudo do projeto e precisa ser auditável.

## Restrições Técnicas e de Conformidade

- **Stack**: Next.js (App Router, exportação estática), React, TypeScript (strict) e
  Node.js 24 LTS, fixado via campo `engines` do `package.json` e arquivo `.nvmrc`.
- **Persistência**: somente APIs do navegador (IndexedDB preferencial; `localStorage` para
  configurações pequenas), encapsuladas em uma camada de repositório testável.
- **Dependências**: toda dependência nova DEVE ser justificada no `plan.md`; dependências que
  façam requisições de rede, coletem telemetria ou exibam anúncios são PROIBIDAS.
- **Testes**: testes unitários para lógica de domínio (contagem de tempo, limites,
  consentimento) e testes end-to-end para o fluxo do responsável e para o bloqueio ao atingir o
  limite. Cobertura de linhas no código novo SHOULD ser ≥ 80%.
- **Verificação de privacidade**: antes de cada entrega, DEVE ser confirmado (DevTools/teste E2E
  com interceptação de rede) que nenhuma requisição de saída com dados é realizada.
- **Idioma**: interface do responsável e documentação em português do Brasil.

## Fluxo de Desenvolvimento e Portões de Qualidade

1. Toda feature segue o fluxo Spec Kit: `specify` → `clarify` (quando houver ambiguidade) →
   `plan` → `tasks` → `analyze` → `implement`.
2. O "Constitution Check" do `plan.md` DEVE verificar explicitamente os Princípios I a VI; uma
   violação não justificada bloqueia a passagem para `tasks`.
3. Uma feature só é considerada concluída quando: build e testes passam; o Quality Gate do
   SonarQube está aprovado; a verificação de ausência de tráfego de rede passou; os alvos de
   toque infantis foram verificados (≥ 64×64 px); e `metricas-ia.md` está atualizado com métricas
   de IA e snapshot SonarQube.
4. Cada falha em um desses portões que exija nova interação com o agente DEVE ser contabilizada
   como rodada de correção (Princípio VI).

## Governance

- Esta constituição prevalece sobre quaisquer outras práticas, templates ou instruções do
  projeto. Em caso de conflito, aplica-se a constituição.
- Emendas DEVEM ser feitas via `/speckit-constitution`, com Sync Impact Report, justificativa e
  avaliação de impacto nas features em andamento.
- Versionamento semântico: MAJOR para remoção ou redefinição incompatível de princípios; MINOR
  para novo princípio/seção ou ampliação material; PATCH para esclarecimentos e redação.
- Toda revisão de plano, tarefa ou código DEVE verificar conformidade com os princípios; os
  princípios I, II e IV não admitem exceção. Exceções aos limites numéricos do Princípio V exigem
  justificativa registrada.
- A conformidade DEVE ser revisada ao fim de cada feature, junto com a consolidação das métricas.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
