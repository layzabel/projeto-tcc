# Data Model — Infraestrutura de Qualidade e Métricas

**Feature**: `001-quality-metrics-infra` | **Data**: 2026-10-31

Não há banco de dados. As entidades abaixo existem como linhas de tabelas Markdown em
`specs/<feature>/metricas-ia.md` (formato em [contracts/metricas-ia-format.md](contracts/metricas-ia-format.md))
ou como valores transitórios lidos de ferramentas externas (ccusage, transcrições, SonarQube).

## Etapa

| Campo | Tipo | Regras |
|---|---|---|
| `nome` | texto | `constitution`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, `correcao-N` (N ≥ 1) ou `registro`. Linhas agregadas usam nomes unidos por `+` (ex.: `constitution+specify`); `registro` nunca é agregado. |
| `sessoes` | lista de UUID | ≥ 1 ID de sessão do Claude Code. Cada sessão pertence a no máximo uma linha de IA da feature. |

- **Prompt de correção** (= "rodada de correção" do Princípio VI): contado em `rodadas_correcao`
  da etapa em que ocorre (FR-011c).
- **Etapa `correcao-N`**: sessão própria depois do fim de `implement`, para tratar um portão
  reprovado; `rodadas_correcao` ≥ 1; termina com medição SonarQube (FR-011c).
- **`registro`**: sessão de registro (FR-011b); custo de medição, fora dos totais das etapas;
  `rodadas_correcao` = 0.
- Desvio (sessão com mais de uma etapa por engano) → linha agregada com `observacao` preenchida;
  etapa agregada sem `tipo = retroativo` e com `observacao` vazia é recusada.

## Medição de IA (linha da tabela "Medições de IA")

| Campo | Tipo | Origem | Validação |
|---|---|---|---|
| `data_hora` | ISO 8601 com fuso | `metadata.lastActivity` mais recente das sessões | obrigatório |
| `etapa` | texto | argumento `--etapa` | conforme entidade Etapa |
| `modelo` | texto | `modelsUsed` do ccusage (união, separados por `+`) | ID exato, nunca abreviado |
| `tokens_entrada` | inteiro ≥ 0 | soma de `inputTokens` | — |
| `tokens_saida` | inteiro ≥ 0 | soma de `outputTokens` | — |
| `tokens_cache_escrita` | inteiro ≥ 0 | soma de `cacheCreationTokens` | — |
| `tokens_cache_leitura` | inteiro ≥ 0 | soma de `cacheReadTokens` | — |
| `custo_usd` | decimal | soma de `totalCost` | precisão completa do JSON, sem arredondar |
| `prompts` | inteiro ≥ 1 | transcrição da sessão (regra R12 do [research.md](research.md)) | — |
| `rodadas_correcao` | inteiro ≥ 0 | argumento `--correcoes` (número de prompts de correção) | ≥ 1 quando `etapa` é `correcao-N`; = 0 quando `etapa` é `registro` |
| `versao_ccusage` | semver | constante fixada no script | igual à versão efetivamente executada |
| `sessoes` | UUIDs separados por `,` | argumento `--sessao` | cada ID existe no ccusage |
| `tipo` | enum | `no momento` \| `retroativo` | — |
| `observacao` | texto | opcional | sem `|` nem quebra de linha |

**Regras**:
- Se o ccusage falhar, não encontrar algum ID ou devolver zero sessões, nenhuma linha é gravada
  (FR-012).
- A sessão ativa não pode ser registrada (R11).
- Uma sessão já presente em outra linha da mesma feature é recusada (evita dupla contagem).

## Escopo de análise

| Valor | Projeto Sonar | `sonar.sources` | Papel |
|---|---|---|---|
| `app` | `tcc-controle-parental-app` | `src` | base da comparação com o braço de vibe coding |
| `scripts` | `tcc-controle-parental-scripts` | `scripts` | dado complementar |

Exclusões e a regra de disjunção estão em [contracts/sonar-scopes.md](contracts/sonar-scopes.md).

## Medição SonarQube (linha da tabela "Medições SonarQube")

| Campo | Tipo | Origem |
|---|---|---|
| `data_hora` | ISO 8601 | `executedAt` da tarefa de análise (`api/ce/task`) |
| `etapa` | texto | argumento `--etapa` (`implement`, `correcao-N`) |
| `escopo` | `app` \| `scripts` | — |
| `analise` | texto | `analysisId` da tarefa |
| `linha_base` | `sim` \| `não` | `sim` se não há linha anterior do mesmo escopo no arquivo |
| `bugs` | inteiro | `bugs` |
| `vulnerabilidades` | inteiro | `vulnerabilities` |
| `code_smells` | inteiro | `code_smells` |
| `duplicacao_pct` | decimal | `duplicated_lines_density` |
| `ciclomatica_total` | inteiro | `complexity` |
| `ciclomatica_max_funcao` | inteiro | ESLint `complexity` limite 0 sobre os arquivos do escopo (R9, FR-014) |
| `cognitiva_total` | inteiro | `cognitive_complexity` |
| `cognitiva_max_funcao` | inteiro | ESLint `sonarjs/cognitive-complexity` limite 0 sobre os arquivos do escopo (R9, FR-014) |
| `divida_min` | inteiro | `sqale_index` |
| `manutenibilidade` | `A`–`E` | `sqale_rating` (1→A … 5→E) |
| `cobertura_pct` | decimal | `coverage` |
| `quality_gate` | `OK` \| `ERROR` | `api/qualitygates/project_status` |

**Regras**:
- As duas linhas (app e scripts) de uma execução só são gravadas se as duas análises, a verificação
  de escopo e todas as leituras terminarem com sucesso; senão nada é gravado.
- A linha de base de cada escopo precede qualquer `correcao-N` (SC-007); o script recusa
  `--etapa correcao-N` se ainda não existir linha de base do escopo.

## Arquivo de métricas

- Um por feature: `specs/<feature>/metricas-ia.md`.
- Estados: *inexistente* → (primeiro registro) → *com cabeçalho e 1 linha* → (registros) →
  *com N linhas*. Não há transição que remova ou altere linhas.
- Invariante a cada gravação: `linhas_antigas == linhas_novas − {linha inserida}`, na mesma ordem.

## Consolidado

- `docs/metricas/consolidado.md`, regenerado inteiro a partir de todos os arquivos de métricas.
- IA: por feature, soma de tokens, custo, prompts e rodadas das etapas (sem as linhas
  `registro`); total geral.
- Custo de medição: por feature, soma das linhas `registro`; total geral; seção própria, fora da
  comparação (FR-011b, FR-018).
- SonarQube: por feature, a última linha de cada escopo; seção app separada da seção scripts.
