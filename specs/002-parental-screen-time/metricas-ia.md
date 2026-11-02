# Métricas de IA e Qualidade — 002-parental-screen-time

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
| 2026-11-02T15:48:28.000Z | implement | app | f6822313-01fe-4542-8a14-08d1ee0b44fa | sim | 0 | 0 | 63 | 0.0 | 795 | 9 | 290 | 8 | 315 | A | 90.6 | OK |
| 2026-11-02T15:49:22.000Z | implement | scripts | df43370d-042e-42fc-b718-e7913246c7bc | sim | 0 | 0 | 9 | 0.0 | 499 | 10 | 224 | 12 | 45 | A | 81.4 | OK |
<!-- fim:sonar -->
