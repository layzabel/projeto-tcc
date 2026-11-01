# Contrato — Comandos npm

Todos os comandos rodam sem interação (FR-005), no PowerShell ou no Git Bash, a partir da raiz do
repositório. Nenhum comando imprime o valor de `SONAR_TOKEN`.

## `npm run verify` (FR-001 a FR-005)

Executa, nesta ordem, parando na primeira falha:

| # | Etapa (`<nome>`) | Comando interno | Código de saída se falhar |
|---|---|---|---|
| 1 | `tipos` | `tsc --noEmit -p tsconfig.json`, `tsc --noEmit -p scripts/tsconfig.json` e `tsc --noEmit -p src/pwa/tsconfig.json` | 1 |
| 2 | `padroes` | `eslint . --max-warnings=0` e `prettier --check .` | 2 |
| 3 | `testes` | `vitest run --coverage` | 3 |
| 4 | `build` | `next build` (gera `out/`) e `node scripts/pwa/generate-sw.ts` (gera `out/sw.js`) | 4 |

- Antes de cada etapa: `VERIFY ▶ etapa=<nome>`.
- Falha: `VERIFY FALHOU: etapa=<nome> (código <n>)` na saída de erro; etapas seguintes não rodam.
- Sucesso: `VERIFY OK: 4/4 etapas`, código 0.
- A saída das ferramentas é repassada sem filtro (arquivo, linha, coluna, nome da função quando a regra informa, nome do teste).
- Cobertura gerada em `coverage/` (`index.html`, `lcov.info`); percentual não afeta o código de
  saída.

Os scripts individuais `typecheck`, `lint`, `format:check`, `test`, `build` também existem.

## `npm run sonar:up`

`docker compose up -d sonarqube` e espera `api/system/status` = `UP` (até 5 min). Código ≠ 0 se o
Docker não estiver disponível ou o tempo esgotar.

## `npm run sonar:setup`

Idempotente. Requer `SONAR_TOKEN` com permissão de administrador e `SONAR_HOST_URL` (padrão
`http://localhost:9000`). Primeiro define o modo Standard Experience
(`sonar.multi-quality-mode.enabled=false`) e confere o valor; depois cria/atualiza o perfil
`TCC TypeScript`, o Quality Gate `TCC` e os dois projetos ([sonar-scopes.md](sonar-scopes.md)).
Código ≠ 0 com mensagem em pt-BR se o modo não puder ser definido.

## `npm run sonar -- --etapa <etapa>` (FR-006 a FR-009, FR-014, FR-015, FR-017)

1. Confere `SONAR_TOKEN` definido e servidor `UP`; senão sai com código 10 e
   `SONAR FALHOU: servidor indisponível em <url>` / `SONAR FALHOU: SONAR_TOKEN não definido`.
2. Exige `coverage/lcov.info` (rodar `npm run verify` antes); senão código 11.
3. Analisa o escopo `app`, depois `scripts` (`sonar.qualitygate.wait=true`). Gate reprovado **não**
   impede o registro (o resultado `ERROR` é dado do estudo); falha do scanner sai com código 12.
   Como o scanner também sai com código ≠ 0 quando o gate reprova, o critério é: antes de cada
   execução, apagar `.scannerwork/report-task.txt`; se o scanner sair com código ≠ 0, o arquivo
   existir e `api/ce/task` do `ceTaskId` lido nele estiver `SUCCESS` → gate reprovado, segue
   adiante; senão → falha do scanner, código 12.
4. Verifica o escopo (SC-004); arquivo fora do escopo → código 13, lista os arquivos.
5. Lê as métricas, calcula os máximos por função e acrescenta as 2 linhas em `metricas-ia.md`.
   Imprime as linhas gravadas e a situação dos dois gates.

Em qualquer falha dos passos 1–5 nenhuma linha é gravada.

## `npm run metrics:ia -- --etapa <etapa> --sessao <id[,id…]> [--correcoes <n>] [--retroativo] [--obs "<texto>"]`

(FR-010 a FR-013, FR-016, FR-020)

- Consulta `npx -y ccusage@20.0.46 session --json --offline --id <id>` para cada ID e lê a
  transcrição de cada sessão para contar prompts.
- Roda numa sessão de registro (FR-011b), depois que a sessão da etapa terminou.
- `--etapa` aceita os nomes da entidade Etapa do [data-model.md](../data-model.md), incluindo
  `registro` (sessão de registro anterior, sempre com `--correcoes 0`).
- Sem `--correcoes`, lista os prompts encontrados e sai com código 20 pedindo o número de prompts
  de correção (FR-011c); o agente classifica e roda de novo.
- Recusa (código 21) a sessão ativa e sessões já registradas na feature.
- Etapa agregada (nomes unidos por `+`) sem `--retroativo` é desvio (sessão com mais de uma etapa
  por engano) e exige `--obs` não vazio; sem ele, a linha é recusada como as demais validações de argumento e nada é gravado.
- ccusage indisponível ou sessão inexistente → código 22, nada gravado.
- Sessão com custo 0 e tokens > 0 (modelo sem preço na tabela embutida do ccusage) → código 22,
  nada gravado.
- Feature alvo: a do diretório `specs/` resolvida pelo Spec Kit (`SPECIFY_FEATURE` ou a mais
  recente); pode ser forçada com `--feature <dir>`.

## `npm run metrics:check` (SC-005, SC-006 auxiliar)

Para cada linha de IA de todas as features, consulta o ccusage (mesma versão da linha, `--offline`)
e compara tokens e custo. Código 0 se 100% idênticos; senão lista as divergências
(feature/linha/coluna/esperado/obtido) e sai com 30. Falha do ccusage numa linha conta como
divergência, com o motivo no lugar do valor obtido.

## `npm run metrics:consolidar` (FR-018)

Regenera `docs/metricas/consolidado.md`, com as linhas `registro` em seção própria de custo de
medição, fora dos totais das etapas. Código 0; código 40 se algum arquivo de métricas estiver
fora do formato.

## Variáveis de ambiente

| Variável | Obrigatória para | Padrão |
|---|---|---|
| `SONAR_TOKEN` | `sonar`, `sonar:setup` | — (nunca versionada) |
| `SONAR_HOST_URL` | `sonar`, `sonar:setup`, `sonar:up` | `http://localhost:9000` |
| `SPECIFY_FEATURE` | `metrics:ia`, `sonar` (opcional) | feature mais recente em `specs/` |
