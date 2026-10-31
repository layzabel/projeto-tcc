# Contrato — Formato de `specs/<feature>/metricas-ia.md`

Arquivo Markdown somente-acréscimo (FR-016). O cabeçalho abaixo é criado no primeiro registro; as
linhas `<!-- ... -->` são âncoras usadas pelo script para localizar cada tabela e MUST NOT ser
editadas.

```markdown
# Métricas de IA e Qualidade — <feature>

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
<!-- fim:sonar -->
```

## Regras de linha

- Uma nova linha é inserida imediatamente antes de `<!-- fim:ia -->` ou `<!-- fim:sonar -->`.
- Células não contêm `|` nem quebra de linha; célula vazia = string vazia (só `observacao`).
- Números inteiros sem separador de milhar; decimais com ponto (`2.2623252`), precisão como
  devolvida pela fonte.
- `data_hora` em ISO 8601 UTC (`2026-10-31T13:17:53.734Z`).
- Exemplo de linha de IA (valores ilustrativos de formato):

```text
| 2026-01-01T12:00:00.000Z | clarify | claude-opus-5-5 | 10 | 2000 | 30000 | 400000 | 1.2345678 | 3 | 0 | 20.0.46 | 00000000-0000-0000-0000-000000000000 | retroativo | |
```

## Invariantes verificados a cada gravação

1. As linhas do arquivo anterior aparecem no novo arquivo, na mesma ordem, idênticas byte a byte.
2. O novo arquivo tem exatamente 1 linha a mais (ou 2, no registro SonarQube app+scripts).
3. Gravação via arquivo temporário + `rename` (sem linha parcial).

Violação de qualquer invariante aborta a gravação e deixa o arquivo original intacto.
