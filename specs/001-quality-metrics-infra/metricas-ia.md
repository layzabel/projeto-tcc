# Métricas de IA e Qualidade — 001-quality-metrics-infra

Arquivo gerado e mantido pelos scripts `metrics:ia` e `sonar`. Não editar à mão.
Fonte de tokens e custo: ccusage (relatório de sessões, `--offline`). Fonte de qualidade: SonarQube local.

## Medições de IA

<!-- tabela:ia -->
| data_hora | etapa | modelo | tokens_entrada | tokens_saida | tokens_cache_escrita | tokens_cache_leitura | custo_usd | prompts | rodadas_correcao | versao_ccusage | sessoes | tipo | observacao |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-31T13:17:53.734Z | constitution+specify+clarify | claude-opus-5-5 | 66 | 31924 | 153335 | 1984506 | 2.2623252 | 7 | 0 | 20.0.46 | 36aef780-3ba6-4fdf-993f-5cb68bd722ac | retroativo | |
| 2026-10-31T13:46:40.241Z | plan | claude-opus-5-5 | 22 | 30468 | 62428 | 632336 | 1.2353392 | 1 | 0 | 20.0.46 | 16f54813-d7f4-4131-886b-145f75081933 | retroativo | |
| 2026-10-31T13:59:19.979Z | tasks | claude-opus-5-5 | 18 | 22017 | 73550 | 562752 | 1.1413624 | 1 | 0 | 20.0.46 | adf58e99-d231-49a8-a808-915a55b479e3 | retroativo | |
| 2026-11-01T22:24:14.503Z | analyze | claude-opus-5-5 | 108 | 137353 | 430095 | 4984606 | 7.1851732000000000 | 6 | 3 | 20.0.46 | 9431fdce-15b5-4d1a-b090-79c58980d84f,47e2ebba-af88-4288-9476-5749c413aa71,d9d15997-a6c4-4043-9381-a3aec0e67cc0 | retroativo | |
| 2026-11-01T22:14:29.567Z | constitution | claude-opus-5-5 | 10 | 4031 | 27476 | 200807 | 0.34062939999999997 | 1 | 1 | 20.0.46 | 2bcb61a1-52a1-4037-907b-12a09ebad0ac | retroativo | emenda v1.0.1 |
| 2026-11-02T00:21:59.694Z | implement | claude-opus-5-5 | 240 | 137665 | 251402 | 21030014 | 8.971478800000002 | 2 | 0 | 20.0.46 | 3010ee3d-e152-44cc-9c78-0b7bd859ae14 | no momento | |
<!-- fim:ia -->

## Medições SonarQube

<!-- tabela:sonar -->
| data_hora | etapa | escopo | analise | linha_base | bugs | vulnerabilidades | code_smells | duplicacao_pct | ciclomatica_total | ciclomatica_max_funcao | cognitiva_total | cognitiva_max_funcao | divida_min | manutenibilidade | cobertura_pct | quality_gate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-02T00:19:34.000Z | implement | app | c5f5126b-3569-48b8-b9f3-212bb963d5a2 | sim | 0 | 0 | 0 | 0.0 | 25 | 5 | 12 | 7 | 0 | A | 33.1 | OK |
| 2026-11-02T00:20:16.000Z | implement | scripts | 9d178bfa-ecc4-4737-a393-cc4b3ef66e58 | sim | 0 | 0 | 9 | 0.0 | 482 | 10 | 216 | 12 | 45 | A | 81.3 | OK |
<!-- fim:sonar -->
