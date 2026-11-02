# Quickstart — validação da feature 002 (Controle Parental de Tempo de Tela)

Guia de execução e checklist de aceitação. Detalhes de comportamento ficam nos contratos
([screens](contracts/screens.md), [storage-schema](contracts/storage-schema.md),
[export-format](contracts/export-format.md), [e2e](contracts/e2e.md)) e no
[data-model.md](data-model.md); a infraestrutura reutilizada está no
[quickstart da 001](../001-quality-metrics-infra/quickstart.md).

## Pré-requisitos

- Node.js 24 LTS (`.nvmrc`), dependências instaladas com `npm ci`.
- Chromium do Playwright, uma vez por máquina: `npx playwright install chromium`.
- Para a análise: Docker e o SonarQube local da 001 (`npm run sonar:up`, `npm run sonar:setup`,
  `SONAR_TOKEN` definido).

## Cenário 1 — Comando único (SC-014, FR-054, FR-055)

```powershell
npm run verify
```

Esperado: `VERIFY ▶ etapa=tipos` … `VERIFY ▶ etapa=e2e` e, por fim, `VERIFY OK: 5/5 etapas`,
código 0. A etapa `testes` roda os unitários do domínio (contagem, virada do dia, limites, aviso,
encerramento, consentimento, senha, retenção); a etapa `e2e` roda toda a suíte de
[contracts/e2e.md](contracts/e2e.md) sobre o `out/` recém-gerado, com a fixture de rede.

## Cenário 2 — Unitários do domínio, isolados

```powershell
npx vitest run tests/unit/app/domain
```

Esperado: todos passam. Casos mínimos, todos com relógio injetado:

| Caso | Requisito |
|---|---|
| 60 min de ticks intercalados com segundo plano e área do adulto → diferença ≤ 5 s | SC-002 |
| intervalos de +2 h, −1 h, +24 h entre ticks → acréscimo ≤ 5 s, nunca redução | SC-003, FR-013 |
| `rollover` com data maior, igual e menor; arquivamento e retenção > 30 dias | FR-018, FR-019, FR-044 |
| `sanitize` com limites 0, 14, 17, 61, 999, `"abc"` → 15, 15, 15, 60, 60, 60 | FR-016, SC-005 |
| limiares de céu, vaga-lumes, humor e aviso uma vez por dia | FR-007 a FR-009 |
| `closureSteps` dos 3 estilos; reinício aborta a execução anterior | FR-027, FR-028, SC-006 |
| derivação de senha: verifica certa, recusa errada, sal novo a cada troca | FR-043 |
| visões de 7/30 dias com histórico conhecido de 40 dias | FR-040, SC-009 |

## Cenário 3 — Ponta a ponta, isolado

```powershell
npm run build
npm run e2e
```

Esperado: todos os arquivos `tests/e2e/*.spec.ts` passam e a fixture `semRedeExterna` não aponta
nenhuma URL externa.

## Cenário 4 — Uso manual no celular (checklist de aceitação)

1. `npm run build` e `node scripts/e2e/serve-out.ts`; abrir `http://127.0.0.1:4310` no navegador
   (ou no celular via encaminhamento de porta do DevTools, que mantém `localhost` como contexto
   seguro).
2. Percorrer a configuração com limite 15 min e aviso padrão. Conferir a orientação de uso
   supervisionado na conclusão.
3. No mundo da criança: convite do mascote para chamar um adulto (só na primeira abertura do dia);
   botões Brincar, História e Mascote sem depender de leitura.
4. Deixar o tempo correr: céu muda de dia → tarde → anoitecer, vaga-lumes apagam, aviso aos 5 min.
5. No fim: encerramento no estilo Respiração, escolha de cartão, despedida e bloqueio. Recarregar:
   continua bloqueado.
6. Segurar "sou o adulto" por menos de 3 s (nada acontece) e por 3 s; senha errada (mensagem,
   vibração no celular) e certa; "Encerrar agora" indisponível no dia encerrado.
7. Registro: 7 barras, média, dias com uso, total e 30 dias; Exportar e abrir o JSON: sem senha.
8. "Apagar todos os dados": volta à configuração; DevTools › Application › Local Storage vazio.

## Cenário 5 — Offline e instalação (FR-047, SC-011)

1. Com o site aberto uma vez, DevTools › Application › Service Workers: `sw.js` ativo.
2. DevTools › Network › Offline; recarregar: a aplicação abre e funciona.
3. No Chrome Android: menu › "Instalar app"/"Adicionar à tela inicial"; no Safari iOS: Compartilhar ›
   "Adicionar à Tela de Início". O ícone aparece e a aplicação abre em tela cheia.

## Cenário 6 — Privacidade (Princípio II, verificação antes da entrega)

DevTools › Network com "Preserve log", percorrendo o Cenário 4: todas as requisições são da própria
origem. Conferir também que a voz só é usada quando há voz local em português
(`speechSynthesis.getVoices().filter(v => v.localService && v.lang.startsWith('pt'))`).

## Cenário 7 — SonarQube e métricas (FR-054, Princípios V e VI)

```powershell
npm run verify
npm run sonar -- --etapa implement
```

Esperado: Quality Gate `TCC` aprovado no escopo `app` e no `scripts`; as linhas da análise são
acrescentadas a `specs/002-parental-screen-time/metricas-ia.md`. As linhas de IA de cada etapa
(`plan`, `tasks`, `analyze`, `implement`, `correcao-N`) são registradas numa sessão de registro
posterior com `npm run metrics:ia -- --etapa <etapa> --sessao <id>`, e o consolidado com
`npm run metrics:consolidar`, como na 001.

## Critério de conclusão

- [x] `npm run verify` → `VERIFY OK: 5/5 etapas`.
- [ ] Quality Gate do SonarQube aprovado nos dois escopos; snapshot em `metricas-ia.md`.
- [ ] Fixture `semRedeExterna` sem apontamentos e Cenário 6 conferido.
- [x] `toque.spec.ts` aprovado (≥ 64×64 px, 8 px, em 320/390/1280).
- [x] `acessibilidade.spec.ts` aprovado.
- [ ] Cenários 4 e 5 conferidos no celular.
- [ ] `metricas-ia.md` com as linhas de IA das etapas e `docs/metricas/consolidado.md` atualizado.
