# Métricas de IA e Qualidade — 002-parental-screen-time

Arquivo gerado e mantido pelos scripts `metrics:ia` e `sonar`. Não editar à mão.
Fonte de tokens e custo: ccusage (relatório de sessões, `--offline`). Fonte de qualidade: SonarQube local.

## Medições de IA

<!-- tabela:ia -->
| data_hora | etapa | modelo | tokens_entrada | tokens_saida | tokens_cache_escrita | tokens_cache_leitura | custo_usd | prompts | rodadas_correcao | versao_ccusage | sessoes | tipo | observacao |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-02T00:50:54.002Z | specify | claude-opus-5-5 | 30 | 29346 | 70642 | 850709 | 1.3223178 | 2 | 0 | 20.0.46 | 3706d5a5-0f78-42b1-89c1-a0a738d00854 | retroativo | inclui 1 prompt acidental (specify com placeholder, não executado); tokens não separáveis da sessão |
| 2026-11-02T01:08:58.621Z | clarify | claude-opus-5-5 | 34 | 11342 | 57115 | 998022 | 0.8835004000000001 | 3 | 0 | 20.0.46 | 8bdcf1fa-3ac9-4589-a0c3-56a63c4a65fd | retroativo | |
| 2026-11-02T01:23:47.350Z | plan | claude-opus-5-5 | 28 | 41540 | 103800 | 1122496 | 1.8858112000000002 | 1 | 0 | 20.0.46 | 6f3b0136-6929-460d-a116-49d6c7e94bc0 | retroativo | |
| 2026-11-02T01:31:37.103Z | tasks | claude-opus-5-5 | 18 | 31076 | 115478 | 708607 | 1.6871374000000001 | 1 | 0 | 20.0.46 | 0629bd0d-8f51-4675-afea-419c9198e691 | retroativo | |
| 2026-11-02T01:40:58.307Z | analyze | claude-opus-5-5 | 22 | 14339 | 91537 | 796929 | 1.1785497999999999 | 2 | 1 | 20.0.46 | c675204c-f326-48a1-b738-5d10d0bc5a9f | retroativo | |
| 2026-11-02T15:50:18.075Z | implement | claude-opus-5-5 | 330 | 288172 | 900445 | 51647741 | 23.2978682 | 4 | 0 | 20.0.46 | 300fc17a-9923-498d-b799-32b72a6a68c6 | no momento | inclui 1 alteração de requisito (recuperação de senha: multiplicação → soma) |
<!-- fim:ia -->

## Medições SonarQube

<!-- tabela:sonar -->
| data_hora | etapa | escopo | analise | linha_base | bugs | vulnerabilidades | code_smells | duplicacao_pct | ciclomatica_total | ciclomatica_max_funcao | cognitiva_total | cognitiva_max_funcao | divida_min | manutenibilidade | cobertura_pct | quality_gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-02T15:48:28.000Z | implement | app | f6822313-01fe-4542-8a14-08d1ee0b44fa | sim | 0 | 0 | 63 | 0.0 | 795 | 9 | 290 | 8 | 315 | A | 90.6 | OK |
| 2026-11-02T15:49:22.000Z | implement | scripts | df43370d-042e-42fc-b718-e7913246c7bc | sim | 0 | 0 | 9 | 0.0 | 499 | 10 | 224 | 12 | 45 | A | 81.4 | OK |
<!-- fim:sonar -->
