# Consolidado de métricas do projeto

> Arquivo gerado por `npm run metrics:consolidar`; não editar à mão.

## IA por feature — etapas (sem sessões de registro)

| feature | tokens_entrada | tokens_saida | tokens_cache_escrita | tokens_cache_leitura | custo_usd | prompts | rodadas_correcao |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 001-quality-metrics-infra | 464 | 363458 | 998286 | 29395021 | 21.13630820000000197 | 18 | 4 |
| 002-parental-screen-time | 462 | 415815 | 1339017 | 56124504 | 30.2551848000000003 | 13 | 1 |
| Total | 926 | 779273 | 2337303 | 85519525 | 51.39149300000000227 | 31 | 5 |

## Custo de medição — sessões de registro (fora da comparação)

| feature | tokens_entrada | tokens_saida | tokens_cache_escrita | tokens_cache_leitura | custo_usd | prompts | rodadas_correcao |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 001-quality-metrics-infra | 34 | 8072 | 33440 | 722969 | 0.5736897999999999 | 2 | 0 |
| 002-parental-screen-time | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Total | 34 | 8072 | 33440 | 722969 | 0.5736897999999999 | 2 | 0 |

## Escopo app — base da comparação com o braço de vibe coding

| feature | data_hora | etapa | analise | linha_base | bugs | vulnerabilidades | code_smells | duplicacao_pct | ciclomatica_total | ciclomatica_max_funcao | cognitiva_total | cognitiva_max_funcao | divida_min | manutenibilidade | cobertura_pct | quality_gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001-quality-metrics-infra | 2026-11-02T00:19:34.000Z | implement | c5f5126b-3569-48b8-b9f3-212bb963d5a2 | sim | 0 | 0 | 0 | 0.0 | 25 | 5 | 12 | 7 | 0 | A | 33.1 | OK |
| 002-parental-screen-time | 2026-11-02T15:48:28.000Z | implement | f6822313-01fe-4542-8a14-08d1ee0b44fa | sim | 0 | 0 | 63 | 0.0 | 795 | 9 | 290 | 8 | 315 | A | 90.6 | OK |

## Escopo scripts — dado complementar

| feature | data_hora | etapa | analise | linha_base | bugs | vulnerabilidades | code_smells | duplicacao_pct | ciclomatica_total | ciclomatica_max_funcao | cognitiva_total | cognitiva_max_funcao | divida_min | manutenibilidade | cobertura_pct | quality_gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 001-quality-metrics-infra | 2026-11-02T00:20:16.000Z | implement | 9d178bfa-ecc4-4737-a393-cc4b3ef66e58 | sim | 0 | 0 | 9 | 0.0 | 482 | 10 | 216 | 12 | 45 | A | 81.3 | OK |
| 002-parental-screen-time | 2026-11-02T15:49:22.000Z | implement | df43370d-042e-42fc-b718-e7913246c7bc | sim | 0 | 0 | 9 | 0.0 | 499 | 10 | 224 | 12 | 45 | A | 81.4 | OK |
