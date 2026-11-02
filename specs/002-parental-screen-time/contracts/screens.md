# Contrato — Telas e navegação

A aplicação tem uma única URL (`/`). A tela é sempre **derivada do estado** (R1); a criança não
tem como chegar a uma tela por endereço, histórico do navegador ou recarga.

## 1. Derivação da tela base

`deriveScreen(doc, sessão)` — avaliada nesta ordem, a primeira regra que casa vence:

| # | Condição | Tela base |
|---|---|---|
| 1 | Documento ainda não carregado | `carregando` (neutra, sem conteúdo infantil) |
| 2 | Sem documento, ou `setupCompleted = false` | `configuracao` (recomeça das boas-vindas; um documento incompleto é apagado — US1 cenário 8) |
| 3 | `currentDay.closure = 'concluido'` | `bloqueio` |
| 4 | `closure = 'em-andamento'` ou `exhausted` | `encerramento` |
| 5 | Caso contrário | `sessão.childScreen` (`mundo`, `jogo` ou `historia`) |

A virada do dia (R5) é aplicada ao documento **antes** da derivação; assim um bloqueio do dia
anterior vira `mundo` sozinho (FR-029).

A sobreposição `adultOverlay` (senha, recuperação, painel) fica por cima da tela base 3, 4 ou 5 e
**pausa a contagem** enquanto estiver aberta (FR-012). Fechar a sobreposição reavalia a tabela:
é assim que "voltar" leva à tela coerente (FR-033, US4 cenário 5). Ao fechar sobre `encerramento`,
a execução do encerramento recomeça do início (FR-028).

## 2. Telas e saídas

| Tela | Tipo | Conta tempo? | Saídas |
|---|---|---|---|
| `configuracao` | adulto | não | boas-vindas → consentimento → apelido → limite → senha (+ confirmação) → conclusão → `mundo` |
| `mundo` | infantil | sim | Brincar → `jogo`; História → `historia`; Mascote → frase sorteada (fica); botão adulto → `senha` |
| `jogo` | infantil | sim | voltar → `mundo`; 6 guardados → comemoração → `mundo` após ~3 s |
| `historia` | infantil | sim (fora do encerramento) | 6ª página concluída → `mundo` |
| `encerramento` | infantil | não | etapas (§3) → grava `concluido` → `bloqueio`; botão adulto (todas as etapas) → `senha` |
| `bloqueio` | infantil | não | virada do dia → `mundo`; botão adulto → `senha` |
| `senha` | adulto | não | correta → `painel(hoje)`; "Esqueci a senha" → `recuperacao`; voltar → fecha |
| `recuperacao` | adulto | não | conta certa → nova senha + confirmação → `painel(hoje)`; conta errada → nova conta |
| `painel(aba)` | adulto | não | abas `hoje`, `ajustes`, `registro`; voltar → fecha; "Encerrar agora" confirmado → fecha e grava `em-andamento`; "Apagar todos os dados"/retirar consentimento confirmado → `configuracao` |

O tempo esgotar dentro de `jogo` ou `historia` leva imediatamente a `encerramento` (regra 4).

## 3. Encerramento por estilo (FR-027)

| Estilo | Etapas, na ordem |
|---|---|
| `respiracao` | aviso → respiração ×3 (inspira, solta) → elogio → escolha (4 cartões) → despedida → `bloqueio` |
| `historinha` | aviso → história (6 páginas, US8) → elogio → escolha → despedida → `bloqueio` |
| `simples` | aviso → elogio → escolha → despedida → `bloqueio` |

- **aviso**: som de fim de tempo (obrigatório) + fala com o nome, quando houver.
- **escolha**: a criança toca um cartão; o mascote reage e segue para a despedida.
- Etapas sem interação avançam por tempo; a escolha espera o toque.
- Uma execução por vez; reinício cancela temporizadores, sons e falas da anterior (R7).

## 4. Elementos obrigatórios por tela infantil

| Elemento | `mundo` | `jogo` | `historia` | `encerramento` | `bloqueio` |
|---|---|---|---|---|---|
| Céu (fase), sol, vaga-lumes | ✔ | — | cenário da página | noite | noite, mascote dormindo |
| Mascote com humor | ✔ (FR-008) | incentivo/festejando | ✔ | calmo → dormindo | dormindo |
| Botão "sou o adulto" (3 s) | ✔ | — | — | ✔ (todas as etapas) | ✔ |
| Botão voltar (ícone) | — | ✔ | — | — | — |
| Texto complementar para o adulto | minutos restantes após o aviso (opcional) | — | frase | — | tempo até a meia-noite (opcional) |

## 5. Convenções de marcação (para testes)

- Todo elemento tocável das telas infantis tem `data-alvo-infantil` e nome acessível
  (`aria-label` em pt-BR); medida mínima 64×64 px CSS, 8 px entre alvos (FR-049).
- A raiz de cada tela tem `data-tela="<nome da tela>"` com os nomes da §2.
- O mascote expõe `data-humor="feliz|calmo|com-sono|dormindo|festejando"`; o céu,
  `data-ceu="dia|tarde|anoitecer|noite"`; cada vaga-lume, `data-aceso="true|false"`.
- O balão de fala é uma região `aria-live="polite"`.
- O raiz do documento recebe `data-motion="reduced"` quando o movimento reduzido vale (R13).

Os testes localizam elementos por papel e nome acessível; os atributos `data-*` acima servem para
os estados visuais que não têm papel ARIA.
