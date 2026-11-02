# Data Model — Aplicação de Controle Parental de Tempo de Tela

**Feature**: `002-parental-screen-time` | **Data**: 2026-11-01

Todos os dados persistidos formam um único **Documento** gravado no aparelho (R3). O formato
serializado exato, o saneamento e a migração estão em
[contracts/storage-schema.md](contracts/storage-schema.md); aqui ficam as entidades, as regras de
validação e as transições de estado. Datas de dia são `YYYY-MM-DD` no fuso do aparelho; instantes
são ISO 8601 com fuso.

---

## Documento (raiz)

| Campo | Tipo | Regra |
|---|---|---|
| `schemaVersion` | `1` | Fixo nesta feature. Outro valor → documento tratado como ausente. |
| `consent` | Consentimento | Obrigatório. Sem ele, o documento é tratado como ausente (FR-003). |
| `setupCompleted` | boolean | `false` só entre o aceite e a conclusão da configuração. |
| `profile` | Perfil da criança | Presente quando `setupCompleted`. |
| `settings` | Ajustes | Presente quando `setupCompleted`. |
| `credential` | Credencial do adulto | Presente quando `setupCompleted`. |
| `currentDay` | Dia atual | Presente quando `setupCompleted`. |
| `history` | Registro diário[] | 0 a 30 itens, datas únicas, ordenadas da mais antiga para a mais recente. |

Nenhum outro campo é gravado (FR-042). Campos desconhecidos são descartados na leitura.

## Consentimento

| Campo | Tipo | Regra |
|---|---|---|
| `acceptedAt` | string ISO 8601 | Instante do aceite. |
| `textVersion` | string | Versão do texto de consentimento exibido (ex.: `"1.0"`), constante em `src/content/`. |

- Gravado **sozinho**, como primeiro dado do documento, no momento do aceite (FR-003, SC-001).
- Revogação = "Apagar todos os dados" (FR-045).

## Perfil da criança

| Campo | Tipo | Regra |
|---|---|---|
| `nickname` | string \| null | Opcional. Aparado nas pontas; vazio → `null`; até 18 caracteres (o campo não aceita mais, FR-004); sem outra validação de conteúdo. |

## Ajustes

| Campo | Tipo | Padrão | Regra |
|---|---|---|---|
| `dailyLimitMin` | inteiro | 60 | Limite que vale **a partir do próximo dia** (FR-017). Valores 15, 20, …, 60. Fora disso → valor válido mais próximo (FR-016). |
| `warningMin` | inteiro | 5 | 1 a 15 e `< min(currentDay.limitMin, dailyLimitMin)` (FR-036). |
| `closureStyle` | `'respiracao'` \| `'historinha'` \| `'simples'` | `'respiracao'` | Desconhecido → padrão. |
| `sounds` | boolean | `true` | Só silencia sons de efeito (FR-037). |
| `voice` | boolean | `true` | Fala em voz alta somente com voz local em português (R11). |
| `reducedMotion` | boolean | `false` | OR com `prefers-reduced-motion` (FR-038). |

Regras de alteração (aba Ajustes):

- Novo `dailyLimitMin` com `warningMin ≥ dailyLimitMin` → recusado com mensagem pedindo para
  reduzir o aviso antes (Edge Cases).
- Novo `warningMin` fora de `1..15` ou `≥ min(limite de hoje, limite de amanhã)` → recusado.
- Na leitura de dados adulterados, `warningMin` inválido é saneado para
  `min(max(1, valor), 15, min(limites) − 1)`; se não for inteiro, volta ao padrão 5 e passa pela
  mesma regra.

O "limite de hoje" **não** é ajuste: é `currentDay.limitMin`, fixado na criação do dia.

## Credencial do adulto

| Campo | Tipo | Regra |
|---|---|---|
| `algorithm` | `'PBKDF2-SHA-256'` | Fixo. |
| `iterations` | inteiro | 210 000. |
| `salt` | string base64 | 16 bytes aleatórios, novo a cada troca de senha. |
| `hash` | string base64 | 32 bytes derivados. |

- A senha é exatamente 4 dígitos `0-9`, digitada duas vezes iguais na criação e na troca.
- Nunca gravada em texto, nunca exportada (FR-043). Credencial ausente ou malformada com
  `setupCompleted = true` → documento tratado como ausente (sem senha não há área protegida).

## Dia atual

| Campo | Tipo | Regra |
|---|---|---|
| `date` | `YYYY-MM-DD` | Data local do dia em curso. |
| `usedSeconds` | inteiro ≥ 0 | Nunca diminui durante o dia (FR-015). Saneado para `0..limitMin×60`. |
| `limitMin` | inteiro | Copiado de `settings.dailyLimitMin` quando o dia é criado; saneado como `dailyLimitMin`. |
| `warningPlayed` | boolean | Aviso de "falta pouco" já tocou hoje (FR-009). |
| `supervisionInviteShown` | boolean | Convite "chame um adulto" já feito hoje (FR-006a). |
| `closure` | `'nao-iniciado'` \| `'em-andamento'` \| `'concluido'` | Estado do encerramento. |
| `closureRequestedByAdult` | boolean | Encerramento pedido por "Encerrar agora". |

Valores derivados (não gravados), em `src/domain/`:

| Derivado | Fórmula |
|---|---|
| `limitSeconds` | `limitMin × 60` |
| `remainingSeconds` | `max(0, limitSeconds − usedSeconds)` |
| `consumed` | `usedSeconds / limitSeconds` (0..1) |
| `exhausted` | `usedSeconds ≥ limitSeconds` |
| `skyPhase` | `remaining/limit > 2/3` → `dia`; `> 1/3` → `tarde`; senão `anoitecer` (FR-007) |
| `sunPosition` | `1 − consumed` (0 = horizonte), usado só para desenhar |
| `firefliesLit` | `5 − min(5, floor(consumed / 0.2))` (FR-007; 12 min de 60 → 4 acesos) |
| `mascotMood` (mundo) | `remaining > limit/2` → `feliz`; `remaining > warningMin×60` → `calmo`; senão `com-sono` (FR-008) |
| `shouldWarn` | `!warningPlayed && !exhausted && remainingSeconds ≤ warningMin×60` |
| `dayStatus` (aba Hoje) | `closure = 'concluido'` → `encerrado`; senão `em uso` |

### Transições do dia

```text
            criação do dia (configuração concluída ou virada)
                              │
                              ▼
 ┌──────────────── closure = 'nao-iniciado' ─────────────────┐
 │  contagem ativa (FR-011) · usedSeconds cresce              │
 │  shouldWarn → warningPlayed = true (som + mascote com sono) │
 └──────┬──────────────────────────────────────────┬──────────┘
        │ exhausted                                 │ "Encerrar agora" confirmado
        ▼                                           ▼ (closureRequestedByAdult = true)
 ┌─────────────── closure = 'em-andamento' ──────────────────┐
 │  contagem parada · encerramento roda do início a cada      │
 │  montagem da tela (recarga, volta da área do adulto)       │
 └──────────────────────────┬────────────────────────────────┘
                            │ fim da despedida
                            ▼
                 closure = 'concluido'  (bloqueio)
                            │
                            │ virada do dia (hoje > date)
                            ▼
     arquiva Registro diário → novo Dia atual ('nao-iniciado', usedSeconds = 0)
```

- Não existe transição de `em-andamento` ou `concluido` de volta para `nao-iniciado` no mesmo dia
  (FR-015, clarificação "bloqueio sem liberação").
- Com `exhausted` e `closure = 'nao-iniciado'` na carga (fechado no exato limite), a carga já
  grava `em-andamento`.
- Data do aparelho anterior a `date` → nenhuma transição (FR-019).

## Registro diário (histórico)

| Campo | Tipo | Regra |
|---|---|---|
| `date` | `YYYY-MM-DD` | Única no histórico; sempre `< currentDay.date`. |
| `usedSeconds` | inteiro ≥ 0 | Total do dia ao arquivar. |
| `limitMin` | inteiro 15..60 | Limite vigente naquele dia. |
| `closureHappened` | boolean | `closure = 'concluido'` ao arquivar. |

- **Retenção (FR-044)**: na carga e em cada virada, removidos os registros com
  `idadeEmDias(date, hoje) > 30`, onde `hoje` = `currentDay.date`. Restam no máximo 30.
- Dias sem abertura da aplicação **não** são gravados; as visões de 7 e 30 dias os mostram como 0
  (Edge Cases).

### Visões derivadas da aba Registro (FR-040)

| Visão | Definição |
|---|---|
| `ultimos7` | Para cada data de `hoje − 6` a `hoje`: minutos = `usedSeconds/60` do registro ou do dia atual, 0 se ausente. |
| `totalSemana` | Soma dos 7 valores (em segundos, exibida em minutos). |
| `mediaDiaria` | `totalSemana / 7`, sempre ÷ 7. |
| `diasComUso` | Quantidade, entre os 7, com `usedSeconds > 0` (0..7). Nenhuma sequência é calculada. |
| `ultimos30` | Datas de `hoje − 29` a `hoje`, com minutos (0 se ausente), da mais recente para a mais antiga. |

Arredondamento de exibição: minutos inteiros por `floor` no dia atual e `round` nos totais e na
média (uma casa decimal na média).

## Estado de sessão (não persistido)

| Elemento | Conteúdo |
|---|---|
| `childScreen` | `mundo` \| `jogo` \| `historia` — sub-tela escolhida pela criança. Volta a `mundo` na recarga. |
| `adultOverlay` | `fechado` \| `senha` \| `recuperacao` \| `painel(aba)` — sobreposição da área do adulto. |
| `game` | Os 6 brinquedos (`id`, `cor: 'azul' \| 'vermelho'`, `guardado`), seleção atual, progresso 0..6. |
| `story` | Página atual 1..6, efeito da página já disparado. |
| `closureRun` | Etapa atual e o `AbortController` da execução (R7). |
| `recovery` | Parcelas `a ∈ 20..49` e `b ∈ 20..49` da soma atual (FR-032). |
| `msAccumulator` | Fração de segundo ainda não transferida para `usedSeconds` (R4). |

## Conteúdo fixo (não é dado pessoal)

Em `src/content/`, tipado e versionado no código:

- **Frases carinhosas**: ≥ 5 (FR-005).
- **Brinquedos**: 6 tipos ilustrados; a cor é sorteada por partida com pelo menos 1 de cada cor
  (FR-021).
- **História**: 6 páginas `{ cenário: 'dia'|'tarde'|'anoitecer'|'noite', frase, efeito }`, com os
  efeitos risada, luz enfraquecendo, bocejo, respiração guiada, flores nascendo, dormir (FR-024).
- **Cartões de atividade**: brinquedo, desenhar, abraço em quem cuida de você, livro (FR-027),
  cada um com a reação do mascote.
- **Falas**: cumprimento (com nome e genérico), convite de supervisão, "falta pouquinho", aviso de
  encerramento (com nome e genérico), incentivo do jogo, comemoração, elogio, despedida.
- **Texto do consentimento** com `CONSENT_TEXT_VERSION` e a **recomendação da SBP** exibida na
  configuração e nas três abas do painel.
