# Contrato — Comandos npm

Todos os comandos rodam sem interação (FR-005), no PowerShell ou no Git Bash, a partir da raiz do
repositório. Nenhum comando imprime o valor de `SONAR_TOKEN`.

## `npm run verify` (FR-001 a FR-005)

Executa, nesta ordem, parando na primeira falha:

| # | Etapa (`<nome>`) | Comando interno | Código de saída se falhar |
|---|---|---|---|
| 1 | `tipos` | `tsc --noEmit -p tsconfig.json` e `tsc --noEmit -p scripts/tsconfig.json` | 1 |
| 2 | `padroes` | `eslint . --max-warnings=0` e `prettier --check .` | 2 |
| 3 | `testes` | `vitest run --coverage` | 3 |
| 4 | `build` | `next build` (gera `out/`) | 4 |

- Antes de cada etapa: `VERIFY ▶ etapa=<nome>`.
- Falha: `VERIFY FALHOU: etapa=<nome> (código <n>)` na saída de erro; etapas seguintes não rodam.
- Sucesso: `VERIFY OK: 4/4 etapas`, código 0.
- A saída das ferramentas é repassada sem filtro (arquivo, linha, nome da função, nome do teste).
- Cobertura gerada em `coverage/` (`index.html`, `lcov.info`); percentual não afeta o código de
  saída.

Os scripts individuais `typecheck`, `lint`, `format:check`, `test`, `build` também existem.

## `npm run sonar:up`

`docker compose up -d sonarqube` e espera `api/system/status` = `UP` (até 5 min). Código ≠ 0 se o
Docker não estiver disponível ou o tempo esgotar.

## `npm run sonar:setup`

Idempotente. Requer `SONAR_TOKEN` com permissão de administrador e `SONAR_HOST_URL` (padrão
`http://localhost:9000`). Cria/atualiza perfil `TCC TypeScript`, Quality Gate `TCC` e os dois
projetos ([sonar-scopes.md](sonar-scopes.md)).

## `npm run sonar -- --etapa <etapa>` (FR-006 a FR-009, FR-014, FR-015, FR-017)

1. Confere `SONAR_TOKEN` definido e servidor `UP`; senão sai com código 10 e
   `SONAR FALHOU: servidor indisponível em <url>` / `SONAR FALHOU: SONAR_TOKEN não definido`.
2. Exige `coverage/lcov.info` (rodar `npm run verify` antes); senão código 11.
3. Analisa o escopo `app`, depois `scripts` (`sonar.qualitygate.wait=true`). Gate reprovado **não**
   impede o registro (o resultado `ERROR` é dado do estudo); falha do scanner sai com código 12.
4. Verifica o escopo (SC-004); arquivo fora do escopo → código 13, lista os arquivos.
5. Lê as métricas, calcula os máximos por função e acrescenta as 2 linhas em `metricas-ia.md`.
   Imprime as linhas gravadas e a situação dos dois gates.

Em qualquer falha dos passos 1–5 nenhuma linha é gravada.

## `npm run metrics:ia -- --etapa <etapa> --sessao <id[,id…]> [--correcoes <n>] [--retroativo] [--obs "<texto>"]`

(FR-010 a FR-013, FR-016, FR-020)

- Consulta `npx -y ccusage@20.0.46 session --json --offline --id <id>` para cada ID e lê a
  transcrição de cada sessão para contar prompts.
- Sem `--correcoes`, lista os prompts encontrados e sai com código 20 pedindo o valor (o agente
  classifica e roda de novo).
- Recusa (código 21) a sessão ativa e sessões já registradas na feature.
- ccusage indisponível ou sessão inexistente → código 22, nada gravado.
- Feature alvo: a do diretório `specs/` resolvida pelo Spec Kit (`SPECIFY_FEATURE` ou a mais
  recente); pode ser forçada com `--feature <dir>`.

## `npm run metrics:check` (SC-005, SC-006 auxiliar)

Para cada linha de IA de todas as features, consulta o ccusage (mesma versão da linha, `--offline`)
e compara tokens e custo. Código 0 se 100% idênticos; senão lista as divergências e sai com 30.

## `npm run metrics:consolidar` (FR-018)

Regenera `docs/metricas/consolidado.md`. Código 0; código 40 se algum arquivo de métricas estiver
fora do formato.

## Variáveis de ambiente

| Variável | Obrigatória para | Padrão |
|---|---|---|
| `SONAR_TOKEN` | `sonar`, `sonar:setup` | — (nunca versionada) |
| `SONAR_HOST_URL` | `sonar`, `sonar:setup`, `sonar:up` | `http://localhost:9000` |
| `SPECIFY_FEATURE` | `metrics:ia`, `sonar` (opcional) | feature mais recente em `specs/` |
