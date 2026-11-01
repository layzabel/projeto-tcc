# Feature Specification: Infraestrutura de Qualidade e Métricas

**Feature Branch**: `001-quality-metrics-infra`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Infraestrutura de qualidade e métricas do projeto. Antes de qualquer
funcionalidade do app, o projeto precisa ter uma base que permita verificar e medir a qualidade do
código de forma repetível, executada inteiramente pelo agente. Requisitos: um comando único que
verifica tipos, padrões de código, testes automatizados e a geração da versão final, falhando se
qualquer etapa falhar; testes automatizados com relatório de cobertura; regras que sinalizam funções
com complexidade ciclomática acima de 10 e cognitiva acima de 15; análise no SonarQube local
executada pelo agente, analisando apenas o código da aplicação e excluindo dependências, testes,
arquivos gerados e documentos de especificação; um arquivo de métricas preenchido pelo agente, com
tokens (entrada, saída e cache), custo, número de prompts e rodadas de correção por etapa, extraídos
do relatório de uso da ferramenta ccusage, nunca estimados, e com os resultados do SonarQube (bugs,
vulnerabilidades, code smells, duplicação, complexidade, dívida técnica e nota de
manutenibilidade). Cada medição é uma linha nova, sem sobrescrever as anteriores, e a primeira
medição do SonarQube é registrada antes de qualquer correção. Fora do escopo: qualquer tela ou
funcionalidade da aplicação de controle parental. Esta feature usa a infraestrutura de qualidade e
métricas da feature anterior; ao final, o comando único de verificação deve passar. O estudo não
inclui testes com usuários: todos os critérios de sucesso devem ser verificáveis por testes
automatizados ou pelo checklist de aceitação."

## Clarifications

### Session 2026-10-31

- Q: As etapas anteriores à existência do registro de métricas (constitution, specify, clarify)
  devem ser registradas retroativamente? → A: Sim, todas, a partir dos dados históricos do
  ccusage, marcadas como "retroativo".
- Q: A análise SonarQube deve incluir os scripts de automação ou só o código do app? → A: Incluir
  os scripts, mas analisados e reportados separadamente do código do app; a comparação principal
  do estudo com o braço de vibe coding usa somente o código do app.
- Q: Como separar tokens e custo por etapa, se o ccusage agrega por sessão/dia? → A: Uma sessão
  nova do Claude Code por etapa; cada linha usa o total da sessão no ccusage e guarda o ID da
  sessão.
- Q: O comando único deve falhar quando a cobertura ficar abaixo de um mínimo? → A: Não; a
  cobertura é apenas gerada e reportada, sem limite que faça o comando falhar.

### Revisão pós-analyze 2026-11-01

- O esqueleto passa a funcionar offline nesta feature (manifest + service worker que guarda a
  versão gerada em cache), para cumprir o Princípio II sem adiamento (FR-021, SC-009).
- A etapa `analyze` entra no registro retroativo; "início de implement" sai dele (FR-020).
- A linha de IA de uma etapa é gravada depois que a sessão da etapa termina, numa sessão de
  registro; o custo das sessões de registro é custo de medição, reportado à parte (FR-011a,
  FR-011b, FR-018).
- "Prompt de correção" e "etapa correcao-N" passam a ser conceitos distintos (FR-011c).
- As colunas de complexidade máxima por função vêm do ESLint, não do servidor (FR-014, FR-015).
- A geração do token do SonarQube é um passo manual da pesquisadora (User Story 2, Assumptions).

### Revisão pós-analyze 2026-11-01 (segunda análise)

- O registro retroativo sai da sessão de implement e passa para a primeira sessão de registro
  depois do fim de implement; não há mais exceção à regra das sessões de registro (FR-020).
- A etapa analyze reúne todas as sessões de análise e de correção dos apontamentos (FR-020).
- A linha de base SonarQube é anterior a qualquer etapa `correcao-N` e a qualquer correção
  motivada pela análise, não a qualquer prompt de correção (SC-007).
- A sinalização de complexidade traz o local e, quando a regra fornecer, o nome da função
  (FR-003).

## User Scenarios & Testing *(mandatory)*

Os atores são o **agente de IA** (executa toda a verificação, análise e registro) e a
**pesquisadora** (autora do estudo, que lê os resultados e audita os registros). Não há usuário
final nesta feature.

### User Story 1 - Verificação completa com um único comando (Priority: P1)

O agente executa um único comando que, em sequência, verifica os tipos, verifica os padrões de
código (incluindo os limites de complexidade), executa os testes automatizados com relatório de
cobertura e gera a versão final do app. O comando termina com sucesso somente se todas as etapas
passarem; se qualquer etapa falhar, ele termina com falha e indica qual etapa falhou.

**Why this priority**: é o portão de qualidade mínimo de todas as features futuras; sem ele, nada
pode ser considerado concluído (Constituição, Fluxo de Desenvolvimento, item 3).

**Independent Test**: no esqueleto inicial do projeto, executar o comando e observar código de
saída zero; depois introduzir, um de cada vez, um erro de tipo, uma violação de padrão, um teste
que falha e um erro de geração da versão final, e observar código de saída diferente de zero com a
etapa identificada.

**Acceptance Scenarios**:

1. **Given** o projeto sem erros, **When** o agente executa o comando único, **Then** todas as
   etapas rodam, o relatório de cobertura é gerado e o comando termina com sucesso.
2. **Given** um erro de tipo no código da aplicação, **When** o comando é executado, **Then** ele
   termina com falha e a saída identifica a etapa de verificação de tipos.
3. **Given** uma função com complexidade ciclomática 11 (ou cognitiva 16), **When** o comando é
   executado, **Then** a função é sinalizada com o local (arquivo, linha e coluna) e, quando a
   regra fornecer, o nome da função, e o comando termina com falha.
4. **Given** uma função com complexidade ciclomática 10 e cognitiva 15, **When** o comando é
   executado, **Then** ela não é sinalizada.
5. **Given** um teste automatizado que falha, **When** o comando é executado, **Then** ele termina
   com falha e a saída identifica o teste.
6. **Given** um erro que impede a geração da versão final, **When** o comando é executado,
   **Then** ele termina com falha e a saída identifica a etapa de geração.

---

### User Story 2 - Análise de qualidade local com escopo correto (Priority: P2)

O agente executa a análise no SonarQube local e obtém resultados separados para dois escopos: **app** (código da aplicação,
base da comparação com o braço de vibe coding) e **scripts** (automação da infraestrutura, dado
complementar), com a cobertura de testes importada do relatório gerado na User Story 1.
A análise em si não exige intervenção manual. Os únicos passos manuais são da pesquisadora e são
feitos uma vez, antes da primeira análise: deixar o servidor local disponível e gerar o token de
acesso na interface do SonarQube, fornecendo-o ao agente por variável de ambiente (FR-009).

**Why this priority**: as métricas SonarQube são o principal dado de qualidade do estudo
(Princípio V); um escopo errado (dependências, testes, arquivos gerados, ou scripts misturados ao
app) contaminaria os números da comparação.

**Independent Test**: executar a análise e conferir, na lista de arquivos analisados de cada
escopo, que o escopo app só contém código da aplicação, que o escopo scripts só contém scripts, e
que a cobertura reportada corresponde ao relatório local.

**Acceptance Scenarios**:

1. **Given** o servidor SonarQube local disponível, **When** o agente executa a análise, **Then**
   ela conclui e os resultados ficam disponíveis para leitura pelo agente.
2. **Given** a análise concluída, **When** a lista de arquivos analisados é conferida, **Then**
   nenhum arquivo de dependências, de testes, gerado (versão final, relatórios, caches) ou de
   documentos de especificação aparece, e nenhum arquivo aparece nos dois escopos ao mesmo tempo.
3. **Given** o servidor SonarQube local indisponível, **When** o agente executa a análise,
   **Then** ela termina com falha e mensagem clara, e nenhuma linha de métricas é registrada.

---

### User Story 3 - Registro auditável de métricas de IA e de qualidade (Priority: P3)

Depois que a sessão de cada etapa do desenvolvimento termina (constitution, specify, clarify,
plan, tasks, analyze, implement e cada etapa `correcao-N`), o agente, numa sessão de registro
dedicada, acrescenta ao arquivo de métricas da feature uma nova linha com tokens (entrada, saída,
cache de leitura e de escrita), custo, número de prompts e número de rodadas de correção da etapa,
extraídos do relatório de uso do ccusage. O registro fica para depois do fim da sessão porque só
então o total da sessão no ccusage é final. Ao fim de `implement` e de cada etapa `correcao-N`,
ainda dentro da própria sessão, o agente acrescenta também uma linha com os resultados do
SonarQube. A primeira medição SonarQube é a linha de base, registrada antes de qualquer correção.

**Why this priority**: viabiliza a rastreabilidade exigida pelo Princípio VI; depende das User
Stories 1 e 2 para os dados de qualidade.

**Independent Test**: registrar duas medições seguidas e conferir que o arquivo tem duas linhas
novas, que as linhas anteriores estão byte a byte iguais e que os valores de tokens e custo
coincidem com o relatório de sessões do ccusage para a sessão registrada.

**Acceptance Scenarios**:

1. **Given** um arquivo de métricas com N linhas, **When** o agente registra uma medição, **Then**
   o arquivo passa a ter N+1 linhas e as N linhas anteriores ficam inalteradas.
2. **Given** uma etapa concluída e sua sessão encerrada, **When** a linha de IA é registrada numa
   sessão de registro, **Then** tokens e custo são
   idênticos aos totais da sessão da etapa no relatório de sessões do ccusage, e a linha identifica
   o ID da sessão, a versão do ccusage e o modelo usado.
3. **Given** o ccusage indisponível ou sem dados para a sessão, **When** o agente tenta
   registrar, **Then** nenhuma linha com valores é gravada e a falha é informada; o agente não
   estima valores.
4. **Given** a primeira análise SonarQube da feature, **When** ela é concluída, **Then** é
   registrada como linha de base antes de qualquer alteração de código motivada por ela.
5. **Given** uma etapa `correcao-N` concluída, **When** a nova análise termina, **Then** uma nova
   linha SonarQube é acrescentada, permitindo comparar com a linha de base.
6. **Given** uma sessão de registro encerrada, **When** ela é registrada por uma sessão de
   registro posterior, **Then** a linha tem etapa `registro` e o consolidado a soma em seção de
   custo de medição, fora dos totais das etapas.

---

### Edge Cases

- Função exatamente no limite (ciclomática 10, cognitiva 15) não é sinalizada; 11 e 16 são.
- O projeto ainda não tem testes de funcionalidade: o comando único continua passando, e o
  relatório de cobertura é gerado mesmo com cobertura baixa.
- O arquivo de métricas ainda não existe: é criado com cabeçalho e a primeira linha.
- A gravação de uma linha é interrompida: o arquivo não pode ficar com linha parcial nem perder
  linhas anteriores.
- Uma etapa precisa continuar em outra sessão (por exemplo, sessão encerrada por acidente): a
  linha soma os totais das sessões da etapa e lista todos os IDs de sessão usados.
- Etapas retroativas que ocorreram na mesma sessão (antes desta regra existir): o ccusage não as
  separa, então é registrada uma única linha para a sessão, marcada como "retroativo", listando as
  etapas que ela contém; os valores não são divididos entre as etapas.
- Uma sessão abriga mais de uma etapa por engano: aplica-se a mesma regra da linha agregada, e o
  desvio é anotado na linha.
- A análise SonarQube falha no meio: nenhuma linha parcial é registrada.
- Segredos (token de acesso ao SonarQube) nunca aparecem no arquivo de métricas, na saída
  registrada nem em arquivos versionados.
- Sem rede depois do primeiro carregamento: a página do esqueleto abre a partir do cache do
  service worker.
- Uma nova versão gerada é publicada: o service worker guarda a versão nova e apaga o cache da
  anterior; não ficam duas versões misturadas no cache.
- A última sessão de registro de uma feature não tem sessão de registro seguinte dentro da
  feature: ela é registrada pela primeira sessão de registro posterior (da feature seguinte ou do
  fechamento do estudo), no arquivo de métricas da feature de origem.

## Requirements *(mandatory)*

### Functional Requirements

**Verificação única**

- **FR-001**: O projeto MUST oferecer um único comando que executa, nesta ordem, verificação de
  tipos, verificação de padrões de código, testes automatizados com cobertura e geração da versão
  final.
- **FR-002**: O comando MUST terminar com código de saída diferente de zero se qualquer etapa
  falhar, sem executar as etapas seguintes, e MUST indicar na saída qual etapa falhou.
- **FR-003**: A verificação de padrões MUST sinalizar, com o local (arquivo, linha e coluna) e,
  quando a regra fornecer, o nome da função, toda função com complexidade ciclomática acima de 10
  ou complexidade cognitiva acima de 15, e essa sinalização MUST fazer o comando falhar.
- **FR-004**: Os testes automatizados MUST gerar um relatório de cobertura em formato legível por
  pessoas e em formato importável pelo SonarQube. O percentual de cobertura MUST NOT fazer o
  comando único falhar; ele é apenas reportado (e registrado via SonarQube).
- **FR-005**: O comando MUST ser executável pelo agente sem interação (sem perguntas, prompts ou
  janelas).

**Análise SonarQube**

- **FR-006**: O projeto MUST oferecer um comando, executado pelo agente, que envia o código ao
  SonarQube local e aguarda o resultado da análise.
- **FR-007**: A análise MUST cobrir dois escopos medidos separadamente: **app** (código-fonte da
  aplicação) e **scripts** (scripts de automação da infraestrutura). Cada escopo MUST produzir
  resultados próprios, sem que métricas de um entrem nos números do outro. Ambos MUST excluir
  dependências, arquivos de teste, arquivos gerados (versão final, relatórios, caches) e
  documentos de especificação (`specs/`, `.specify/`, `docs/`).
- **FR-008**: A análise MUST importar a cobertura gerada pelo FR-004.
- **FR-009**: O token de acesso ao SonarQube MUST ser fornecido por variável de ambiente e MUST
  NOT ser gravado em arquivos versionados nem no arquivo de métricas.

**Registro de métricas**

- **FR-010**: Cada feature MUST ter o arquivo `specs/<feature>/metricas-ia.md` (Princípio VI), com
  duas tabelas: medições de IA e medições SonarQube.
- **FR-011**: Cada linha de IA MUST conter: data/hora, etapa, modelo, tokens de entrada, tokens de
  saída, tokens de cache de escrita, tokens de cache de leitura, custo em USD, número de prompts,
  número de rodadas de correção, versão do ccusage, ID da sessão do Claude Code e o tipo de
  registro ("no momento" ou "retroativo").
- **FR-011a**: Cada etapa MUST ser executada em uma sessão nova e exclusiva do Claude Code; os
  tokens e o custo da etapa MUST ser o total dessa sessão (ou a soma das sessões, quando a etapa
  continua em outra) no relatório de sessões do ccusage. A linha de IA da etapa MUST ser gravada
  depois que a última sessão da etapa termina, numa sessão de registro (FR-011b), e nunca dentro
  da sessão que está sendo medida.
- **FR-011b**: Uma **sessão de registro** é uma sessão do Claude Code aberta só para registrar
  medições de sessões já encerradas; ela MUST NOT conter trabalho de nenhuma etapa. O custo dela é
  **custo de medição**: é registrado com etapa `registro` (com zero rodadas de correção) pela
  sessão de registro seguinte e MUST ficar fora dos totais das etapas e da comparação do estudo.
  A última sessão de registro de uma feature é registrada pela primeira sessão de registro
  posterior, no arquivo da feature de origem.
- **FR-011c**: Um **prompt de correção** é um prompt que pede ao agente para corrigir defeito,
  erro de build ou teste, violação da constituição ou apontamento de análise (SonarQube ou
  `/speckit-analyze`) em artefato já gerado; ele corresponde à "rodada de correção" do Princípio
  VI e é contado na coluna de rodadas de correção da etapa em que ocorre. Uma **etapa
  `correcao-N`** é uma sessão própria, aberta depois do fim de `implement`, para tratar um portão
  de qualidade reprovado (comando único, Quality Gate ou verificação de rede/offline); ela tem pelo
  menos um prompt de correção e termina com uma medição SonarQube. Prompts de correção feitos
  durante outra etapa (por exemplo, corrigir um teste durante `implement`) não abrem uma etapa
  `correcao-N`.
- **FR-012**: Tokens e custo MUST ser extraídos do relatório do ccusage; valores estimados,
  arredondados ou digitados manualmente MUST NOT ser registrados. Na ausência de dados, nenhuma
  linha é gravada.
- **FR-013**: O número de prompts MUST ser a contagem de mensagens do usuário na etapa, obtida do
  registro da sessão; o número de rodadas de correção MUST ser o número de prompts de correção
  (FR-011c) da etapa.
- **FR-014**: Cada linha SonarQube MUST conter: data/hora, etapa/rodada, escopo (app ou scripts),
  identificação da análise,
  bugs, vulnerabilidades, code smells, duplicação (%), complexidade ciclomática (total e máxima por
  função), complexidade cognitiva (total e máxima por função), dívida técnica em minutos, nota de
  manutenibilidade e situação do Quality Gate. Como o SonarQube não expõe a complexidade máxima
  por função, as duas colunas de máximo por função MUST ser calculadas pelo agente com o ESLint,
  usando as regras `complexity` e `sonarjs/cognitive-complexity` (a mesma implementação da regra
  cognitiva do SonarQube) sobre os mesmos arquivos do escopo.
- **FR-015**: Os demais valores SonarQube MUST ser lidos do servidor pelo agente. Nenhum valor,
  do servidor ou do ESLint, é transcrito à mão.
- **FR-016**: Toda medição MUST ser acrescentada como nova linha; linhas existentes MUST NOT ser
  alteradas, reordenadas ou apagadas.
- **FR-017**: A primeira medição SonarQube de cada escopo em cada feature MUST ser marcada como
  linha de base e
  registrada antes de qualquer correção motivada pela análise.
- **FR-018**: O projeto MUST manter `docs/metricas/consolidado.md` com a soma das métricas de IA de
  todas as features e a última medição SonarQube de cada escopo de cada feature, gerado a partir
  dos arquivos das features. O consolidado MUST apresentar as métricas do escopo app em seção
  própria, identificada como a base da comparação com o braço de vibe coding; as do escopo scripts
  ficam em seção separada, como dado complementar. O custo das sessões de registro (FR-011b) MUST
  ficar em uma terceira seção, "custo de medição", fora das somas por feature e do total geral das
  etapas.

**Escopo**

- **FR-019**: Esta feature MUST NOT implementar telas ou funcionalidades de controle parental;
  apenas o esqueleto mínimo necessário para que a geração da versão final e a análise tenham o que
  processar, mais o suporte offline do FR-021.
- **FR-020**: Esta feature MUST registrar as próprias etapas no seu arquivo de métricas. Todas as
  etapas ocorridas antes de a infraestrutura de registro existir (constitution, specify, clarify,
  plan, tasks e analyze) MUST ser registradas retroativamente a partir dos dados históricos do
  ccusage, cada linha marcada como "retroativo" e com o(s) ID(s) de sessão de origem. O registro
  retroativo MUST ser feito na primeira sessão de registro (FR-011b) aberta depois do fim de
  implement, nunca dentro da sessão de implement. A etapa analyze inclui todas as sessões de
  análise e todas as sessões em que os apontamentos foram corrigidos nos artefatos. A etapa
  implement não é retroativa: é registrada na mesma sessão de registro, depois que termina.
- **FR-021**: O app MUST funcionar offline depois do primeiro carregamento (Princípio II). A
  versão final MUST incluir um manifest de aplicação web e um service worker que guarda em cache
  todos os arquivos da versão gerada e os serve a partir do cache sem rede. O service worker MUST
  NOT fazer requisições a origens diferentes da do próprio app. Ao publicar uma nova versão, o
  cache da versão anterior MUST ser substituído.

### Key Entities

- **Etapa**: fase do desenvolvimento medida (constitution, specify, clarify, plan, tasks,
  analyze, implement, correção-N), com início e fim.
- **Medição de IA**: uso de tokens, custo, prompts e rodadas de correção de uma etapa, com a origem
  (versão do ccusage e IDs de sessão usados).
- **Escopo de análise**: app (base da comparação do estudo) ou scripts (complementar); cada
  medição SonarQube pertence a exatamente um escopo.
- **Medição SonarQube**: resultados de uma análise de um escopo, ligados a uma etapa ou rodada; a
  primeira de cada escopo é a
  linha de base.
- **Prompt de correção**: prompt que pede correção de defeito, falha de verificação, violação da
  constituição ou apontamento de análise em artefato já gerado; é a "rodada de correção" do
  Princípio VI, contada na etapa em que ocorre (FR-011c).
- **Etapa correcao-N**: sessão própria, depois do fim de implement, para tratar um portão de
  qualidade reprovado; termina com medição SonarQube (FR-011c).
- **Sessão de registro**: sessão dedicada ao registro de medições; seu custo é custo de medição,
  reportado à parte (FR-011b).
- **Arquivo de métricas**: registro somente de acréscimo por feature; o consolidado agrega todos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao final da feature, o comando único de verificação termina com sucesso no projeto.
- **SC-002**: Para cada uma das 4 etapas do comando, um teste automatizado ou item do checklist de
  aceitação demonstra que uma falha nessa etapa faz o comando falhar (4 de 4).
- **SC-003**: Funções-exemplo de teste com complexidade ciclomática 11 e cognitiva 16 são
  sinalizadas, e funções com 10 e 15 não são (100% dos casos de limite corretos).
- **SC-004**: 0 arquivos fora do respectivo escopo aparecem na lista de arquivos analisados de
  cada escopo (nenhum script no escopo app, nenhum arquivo do app no escopo scripts, e nenhuma
  dependência, teste, arquivo gerado ou documento de especificação em nenhum dos dois).
- **SC-005**: 100% das linhas de IA têm tokens e custo idênticos ao relatório de sessões do
  ccusage para os IDs de sessão guardados na linha, conferido por verificação automatizada.
- **SC-006**: Após registrar 2 medições seguidas, as linhas anteriores do arquivo são idênticas às
  de antes (verificado por comparação automatizada).
- **SC-007**: O arquivo de métricas desta feature contém, para cada escopo, uma linha de base
  SonarQube com data/hora anterior ao início de qualquer etapa `correcao-N` e a qualquer correção
  motivada pela análise.
- **SC-008**: Uma verificação automatizada confirma que nenhum arquivo versionado nem o arquivo de
  métricas contêm o token de acesso ao SonarQube.
- **SC-009**: Um teste automatizado confirma que a lista de cache do service worker contém 100%
  dos arquivos da versão gerada, e o checklist de aceitação confirma que, com o servidor local
  parado depois do primeiro carregamento, a página do esqueleto recarrega a partir do cache.

## Assumptions

- Não existe feature anterior: esta é a feature 001, que cria a infraestrutura e a usa em si
  mesma. A frase "usa a infraestrutura da feature anterior" foi entendida como "esta feature aplica
  a própria infraestrutura às suas etapas" (FR-020).
- O SonarQube local (edição Community) roda na máquina da pesquisadora e está acessível ao
  agente; a instalação do servidor pode ser feita pelo agente, mas fica fora dos critérios de
  sucesso. A geração do token de acesso na interface do SonarQube é um passo manual da
  pesquisadora, feito uma vez; o token chega ao agente só por variável de ambiente.
- O ccusage lê os registros locais de uso do Claude Code; o custo registrado é o custo calculado e
  reportado pelo ccusage, sem ajuste.
- A pesquisadora abre uma sessão nova do Claude Code para cada etapa do Spec Kit a partir de
  agora, e outra para cada registro de medições; isso também evita que uma etapa herde o contexto
  acumulado da anterior.
- O estudo compara este desenvolvimento guiado por especificação com um braço de vibe coding; a
  comparação principal usa somente as métricas do escopo app. Os scripts de automação também
  passam pelo comando único (tipos, padrões e testes).
- Os limites de complexidade são os do Princípio V da constituição; o Quality Gate completo é
  configurado no SonarQube local conforme o mesmo princípio.
- Não haverá testes com usuários; todos os critérios são verificados por testes automatizados ou
  pelo checklist de aceitação.
