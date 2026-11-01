# Contrato — Escopos SonarQube

## Projetos

| Escopo | `sonar.projectKey` | Arquivo de propriedades | `sonar.sources` |
|---|---|---|---|
| app | `tcc-controle-parental-app` | `sonar-project.app.properties` | `src` |
| scripts | `tcc-controle-parental-scripts` | `sonar-project.scripts.properties` | `scripts` |

Propriedades comuns aos dois:

```properties
sonar.sourceEncoding=UTF-8
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=**/node_modules/**,**/*.test.*,**/*.spec.*,tests/**,.next/**,out/**,coverage/**,.scannerwork/**,specs/**,.specify/**,docs/**,**/*.d.ts
sonar.qualitygate.wait=true
sonar.qualitygate.timeout=300
```

`sonar.host.url` vem de `SONAR_HOST_URL`; `sonar.token` vem de `SONAR_TOKEN` (lido pelo scanner do
ambiente; nunca escrito nos arquivos de propriedades).

## Verificação de escopo (SC-004)

Após as duas análises, `api/measures/component_tree?component=<key>&qualifiers=FIL&ps=500` (paginado)
lista os arquivos de cada projeto. A verificação passa somente se:

- todo arquivo do escopo **app** começa com `src/` e todo arquivo do escopo **scripts** começa com
  `scripts/`;
- nenhum segmento do caminho (após normalizar `\` para `/` e separar por `/`) é igual a
  `node_modules`, `tests`, `.next`, `out`, `coverage`, `.scannerwork`, `specs`, `.specify` ou
  `docs`, e nenhum nome de arquivo contém `.test.` ou `.spec.`. A comparação é por segmento
  inteiro, não por substring: `src/checkout/x.ts` e `scripts/about/y.ts` passam;
  `src/out/x.ts` falha;
- a interseção das duas listas é vazia;
- cada lista tem ≥ 1 arquivo.

## Quality Gate `TCC` (Overall Code)

| Métrica | Condição de reprovação |
|---|---|
| `bugs` | > 0 |
| `vulnerabilities` | > 0 |
| `security_hotspots_reviewed` | < 100 |
| `duplicated_lines_density` | > 3 |
| `sqale_rating` | > 1 (pior que A) |
| `blocker_violations` | > 0 |
| `critical_violations` | > 0 |

Perfil `TCC TypeScript` (herda de "Sonar way"): S3776 `threshold=15` e S1541 `threshold=10`,
ambas Critical.

O servidor roda no modo **Standard Experience** (`sonar.multi-quality-mode.enabled=false`),
definido pelo `sonar:setup` antes de criar o perfil e o gate, para que as métricas acima (as
legadas, citadas pelo Princípio V) sejam as usadas pelo gate e lidas pelo agente.
