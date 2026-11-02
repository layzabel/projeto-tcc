# Métricas de IA e Qualidade — 001-quality-metrics-infra

Arquivo gerado e mantido pelos scripts `metrics:ia` e `sonar`. Não editar à mão.
Fonte de tokens e custo: ccusage (relatório de sessões, `--offline`). Fonte de qualidade: SonarQube local.

## Medições de IA

<!-- tabela:ia -->
| data_hora | etapa | modelo | tokens_entrada | tokens_saida | tokens_cache_escrita | tokens_cache_leitura | custo_usd | prompts | rodadas_correcao | versao_ccusage | sessoes | tipo | observacao |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- fim:ia -->

## Medições SonarQube

<!-- tabela:sonar -->
| data_hora | etapa | escopo | analise | linha_base | bugs | vulnerabilidades | code_smells | duplicacao_pct | ciclomatica_total | ciclomatica_max_funcao | cognitiva_total | cognitiva_max_funcao | divida_min | manutenibilidade | cobertura_pct | quality_gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-02T00:19:34.000Z | implement | app | c5f5126b-3569-48b8-b9f3-212bb963d5a2 | sim | 0 | 0 | 0 | 0.0 | 25 | 5 | 12 | 7 | 0 | A | 33.1 | OK |
| 2026-11-02T00:20:16.000Z | implement | scripts | 9d178bfa-ecc4-4737-a393-cc4b3ef66e58 | sim | 0 | 0 | 9 | 0.0 | 482 | 10 | 216 | 12 | 45 | A | 81.3 | OK |
<!-- fim:sonar -->
