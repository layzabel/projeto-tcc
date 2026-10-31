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

## User Scenarios & Testing *(mandatory)*

Os atores são o **agente de IA** (executa toda a verificação, análise e registro) e o
**pesquisador** (autor do estudo, que lê os resultados e audita os registros). Não há usuário
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
   executado, **Then** a função é sinalizada com nome e local, e o comando termina com falha.
4. **Given** uma função com complexidade ciclomática 10 e cognitiva 15, **When** o comando é
   executado, **Then** ela não é sinalizada.
5. **Given** um teste automatizado que falha, **When** o comando é executado, **Then** ele termina
   com falha e a saída identifica o teste.
6. **Given** um erro que impede a geração da versão final, **When** o comando é executado,
   **Then** ele termina com falha e a saída identifica a etapa de geração.

---

### User Story 2 - Análise de qualidade local com escopo correto (Priority: P2)

O agente executa a análise no SonarQube local, sem intervenção manual além da disponibilidade do
servidor local, e obtém os resultados apenas do código da aplicação, com a cobertura de testes
importada do relatório gerado na User Story 1.

**Why this priority**: as métricas SonarQube são o principal dado de qualidade do estudo
(Princípio V); um escopo errado (dependências, testes, arquivos gerados) contaminaria os números.

**Independent Test**: executar a análise e conferir, na lista de arquivos analisados, que só
aparecem arquivos do código da aplicação, e que a cobertura reportada corresponde ao relatório
local.

**Acceptance Scenarios**:

1. **Given** o servidor SonarQube local disponível, **When** o agente executa a análise, **Then**
   ela conclui e os resultados ficam disponíveis para leitura pelo agente.
2. **Given** a análise concluída, **When** a lista de arquivos analisados é conferida, **Then**
   nenhum arquivo de dependências, de testes, gerado (versão final, relatórios, caches) ou de
   documentos de especificação aparece.
3. **Given** o servidor SonarQube local indisponível, **When** o agente executa a análise,
   **Then** ela termina com falha e mensagem clara, e nenhuma linha de métricas é registrada.

---

### User Story 3 - Registro auditável de métricas de IA e de qualidade (Priority: P3)

Ao fim de cada etapa do desenvolvimento (constitution, specify, clarify, plan, tasks, analyze,
implement e cada rodada de correção), o agente acrescenta ao arquivo de métricas da feature uma
nova linha com tokens (entrada, saída, cache de leitura e de escrita), custo, número de prompts e
número de rodadas de correção da etapa, extraídos do relatório de uso do ccusage. Ao fim de
`implement` e de cada rodada de correção, acrescenta também uma linha com os resultados do
SonarQube. A primeira medição SonarQube é a linha de base, registrada antes de qualquer correção.

**Why this priority**: viabiliza a rastreabilidade exigida pelo Princípio VI; depende das User
Stories 1 e 2 para os dados de qualidade.

**Independent Test**: registrar duas medições seguidas e conferir que o arquivo tem duas linhas
novas, que as linhas anteriores estão byte a byte iguais e que os valores de tokens e custo
coincidem com o relatório do ccusage do mesmo período.

**Acceptance Scenarios**:

1. **Given** um arquivo de métricas com N linhas, **When** o agente registra uma medição, **Then**
   o arquivo passa a ter N+1 linhas e as N linhas anteriores ficam inalteradas.
2. **Given** uma etapa concluída, **When** a linha de IA é registrada, **Then** tokens e custo são
   idênticos aos valores do relatório do ccusage para o intervalo da etapa, e a linha identifica a
   versão do ccusage e o modelo usado.
3. **Given** o ccusage indisponível ou sem dados para o intervalo, **When** o agente tenta
   registrar, **Then** nenhuma linha com valores é gravada e a falha é informada; o agente não
   estima valores.
4. **Given** a primeira análise SonarQube da feature, **When** ela é concluída, **Then** é
   registrada como linha de base antes de qualquer alteração de código motivada por ela.
5. **Given** uma rodada de correção concluída, **When** a nova análise termina, **Then** uma nova
   linha SonarQube é acrescentada, permitindo comparar com a linha de base.

---

### Edge Cases

- Função exatamente no limite (ciclomática 10, cognitiva 15) não é sinalizada; 11 e 16 são.
- O projeto ainda não tem testes de funcionalidade: o comando único continua passando, e o
  relatório de cobertura é gerado mesmo com cobertura baixa.
- O arquivo de métricas ainda não existe: é criado com cabeçalho e a primeira linha.
- A gravação de uma linha é interrompida: o arquivo não pode ficar com linha parcial nem perder
  linhas anteriores.
- Uma etapa ocorre em mais de uma sessão ou dia: tokens e custo são a soma dos intervalos da etapa
  conforme o ccusage.
- Duas etapas no mesmo dia e na mesma sessão: os valores de cada uma vêm da diferença entre as
  leituras do ccusage no início e no fim da etapa, ambas guardadas na linha.
- A análise SonarQube falha no meio: nenhuma linha parcial é registrada.
- Segredos (token de acesso ao SonarQube) nunca aparecem no arquivo de métricas, na saída
  registrada nem em arquivos versionados.

## Requirements *(mandatory)*

### Functional Requirements

**Verificação única**

- **FR-001**: O projeto MUST oferecer um único comando que executa, nesta ordem, verificação de
  tipos, verificação de padrões de código, testes automatizados com cobertura e geração da versão
  final.
- **FR-002**: O comando MUST terminar com código de saída diferente de zero se qualquer etapa
  falhar, sem executar as etapas seguintes, e MUST indicar na saída qual etapa falhou.
- **FR-003**: A verificação de padrões MUST sinalizar, com nome da função e local, toda função com
  complexidade ciclomática acima de 10 ou complexidade cognitiva acima de 15, e essa sinalização
  MUST fazer o comando falhar.
- **FR-004**: Os testes automatizados MUST gerar um relatório de cobertura em formato legível por
  pessoas e em formato importável pelo SonarQube.
- **FR-005**: O comando MUST ser executável pelo agente sem interação (sem perguntas, prompts ou
  janelas).

**Análise SonarQube**

- **FR-006**: O projeto MUST oferecer um comando, executado pelo agente, que envia o código ao
  SonarQube local e aguarda o resultado da análise.
- **FR-007**: O escopo da análise MUST incluir somente o código-fonte da aplicação e MUST excluir
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
  número de rodadas de correção, versão do ccusage e as leituras de início e fim usadas.
- **FR-012**: Tokens e custo MUST ser extraídos do relatório do ccusage; valores estimados,
  arredondados ou digitados manualmente MUST NOT ser registrados. Na ausência de dados, nenhuma
  linha é gravada.
- **FR-013**: O número de prompts MUST ser a contagem de mensagens do usuário na etapa, obtida do
  registro da sessão; rodadas de correção MUST seguir a definição do Princípio VI.
- **FR-014**: Cada linha SonarQube MUST conter: data/hora, etapa/rodada, identificação da análise,
  bugs, vulnerabilidades, code smells, duplicação (%), complexidade ciclomática (total e máxima por
  função), complexidade cognitiva (total e máxima por função), dívida técnica em minutos, nota de
  manutenibilidade e situação do Quality Gate.
- **FR-015**: Os valores SonarQube MUST ser lidos do servidor pelo agente, não transcritos à mão.
- **FR-016**: Toda medição MUST ser acrescentada como nova linha; linhas existentes MUST NOT ser
  alteradas, reordenadas ou apagadas.
- **FR-017**: A primeira medição SonarQube de cada feature MUST ser marcada como linha de base e
  registrada antes de qualquer correção motivada pela análise.
- **FR-018**: O projeto MUST manter `docs/metricas/consolidado.md` com a soma das métricas de IA de
  todas as features e a última medição SonarQube de cada uma, gerado a partir dos arquivos das
  features.

**Escopo**

- **FR-019**: Esta feature MUST NOT implementar telas ou funcionalidades de controle parental;
  apenas o esqueleto mínimo necessário para que a geração da versão final e a análise tenham o que
  processar.
- **FR-020**: Esta feature MUST registrar as próprias etapas no seu arquivo de métricas, a partir
  de quando a infraestrutura de registro existir, e as etapas anteriores (constitution, specify,
  clarify, plan, tasks) MUST ser registradas retroativamente a partir do ccusage.

### Key Entities

- **Etapa**: fase do desenvolvimento medida (constitution, specify, clarify, plan, tasks,
  analyze, implement, correção-N), com início e fim.
- **Medição de IA**: uso de tokens, custo, prompts e rodadas de correção de uma etapa, com a origem
  (versão do ccusage e leituras usadas).
- **Medição SonarQube**: resultados de uma análise, ligados a uma etapa ou rodada; a primeira é a
  linha de base.
- **Rodada de correção**: prompt que pede correção de defeito, falha de verificação, violação da
  constituição ou apontamento da análise em artefato já gerado.
- **Arquivo de métricas**: registro somente de acréscimo por feature; o consolidado agrega todos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao final da feature, o comando único de verificação termina com sucesso no projeto.
- **SC-002**: Para cada uma das 4 etapas do comando, um teste automatizado ou item do checklist de
  aceitação demonstra que uma falha nessa etapa faz o comando falhar (4 de 4).
- **SC-003**: Funções-exemplo de teste com complexidade ciclomática 11 e cognitiva 16 são
  sinalizadas, e funções com 10 e 15 não são (100% dos casos de limite corretos).
- **SC-004**: 0 arquivos fora do código da aplicação aparecem na lista de arquivos analisados.
- **SC-005**: 100% das linhas de IA têm tokens e custo idênticos ao relatório do ccusage do
  intervalo correspondente, conferido por recálculo a partir das leituras guardadas na linha.
- **SC-006**: Após registrar 2 medições seguidas, as linhas anteriores do arquivo são idênticas às
  de antes (verificado por comparação automatizada).
- **SC-007**: O arquivo de métricas desta feature contém uma linha de base SonarQube com data/hora
  anterior a qualquer rodada de correção.
- **SC-008**: Uma verificação automatizada confirma que nenhum arquivo versionado nem o arquivo de
  métricas contêm o token de acesso ao SonarQube.

## Assumptions

- Não existe feature anterior: esta é a feature 001, que cria a infraestrutura e a usa em si
  mesma. A frase "usa a infraestrutura da feature anterior" foi entendida como "esta feature aplica
  a própria infraestrutura às suas etapas" (FR-020).
- O SonarQube local (edição Community) roda na máquina do pesquisador e está acessível ao agente;
  a instalação do servidor pode ser feita pelo agente, mas fica fora dos critérios de sucesso.
- O ccusage lê os registros locais de uso do Claude Code; o custo registrado é o custo calculado e
  reportado pelo ccusage, sem ajuste.
- A atribuição de tokens por etapa usa a diferença entre leituras do ccusage no início e no fim da
  etapa (ambas registradas), o que não é estimativa.
- "Código da aplicação" é o código-fonte do app; scripts de automação da infraestrutura (como o de
  registro de métricas) ficam fora do escopo da análise SonarQube, mas são cobertos pelo comando
  único (tipos, padrões e testes).
- Os limites de complexidade são os do Princípio V da constituição; o Quality Gate completo é
  configurado no SonarQube local conforme o mesmo princípio.
- Não haverá testes com usuários; todos os critérios são verificados por testes automatizados ou
  pelo checklist de aceitação.
