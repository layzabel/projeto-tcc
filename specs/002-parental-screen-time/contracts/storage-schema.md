# Contrato — Documento gravado no aparelho

Entidades e regras: [data-model.md](../data-model.md). Decisão de armazenamento: R3.

## Chave e formato

- `localStorage`, chave única **`tcc-cp:v1`**, valor JSON UTF-8.
- A aplicação não grava nenhuma outra chave, cookie, IndexedDB ou Cache Storage com dados (o
  Cache Storage do service worker da 001 guarda só os arquivos do site).
- "Apagar todos os dados" = `localStorage.removeItem('tcc-cp:v1')`; depois disso
  `localStorage.length` para a origem é 0 (SC-010).

## Exemplo (configuração concluída)

```json
{
  "schemaVersion": 1,
  "consent": { "acceptedAt": "2026-11-01T19:02:11.123-03:00", "textVersion": "1.0" },
  "setupCompleted": true,
  "profile": { "nickname": "Lia" },
  "settings": {
    "dailyLimitMin": 45,
    "warningMin": 5,
    "closureStyle": "respiracao",
    "sounds": true,
    "voice": true,
    "reducedMotion": false
  },
  "credential": {
    "algorithm": "PBKDF2-SHA-256",
    "iterations": 210000,
    "salt": "q8m4w0n2b1Lx7a9cZ3e5Rg==",
    "hash": "3m5n8X0bYpQh1sWvN2c4dE6fG7hJ9kL0mN1oP2qR3sU="
  },
  "currentDay": {
    "date": "2026-11-01",
    "usedSeconds": 1500,
    "limitMin": 60,
    "warningPlayed": false,
    "supervisionInviteShown": true,
    "closure": "nao-iniciado",
    "closureRequestedByAdult": false
  },
  "history": [
    { "date": "2026-10-30", "usedSeconds": 3600, "limitMin": 60, "closureHappened": true }
  ]
}
```

Logo após o aceite, e só então, o documento é apenas
`{ "schemaVersion": 1, "consent": {...}, "setupCompleted": false }` (FR-003). Os demais campos são
gravados juntos, numa única escrita, na tela de conclusão.

## Leitura e saneamento (`load`)

Executado em toda leitura. Nunca lança exceção para a interface.

| Situação lida | Resultado |
|---|---|
| Chave ausente, JSON inválido, `schemaVersion ≠ 1` ou `consent` inválido | "sem documento" → configuração |
| `setupCompleted = false` | documento incompleto → removido → configuração (US1 cenário 8) |
| `setupCompleted = true` sem `credential` válida, `currentDay` válido ou `settings` | "sem documento" → configuração |
| `dailyLimitMin` ou `currentDay.limitMin` fora de 15..60 ou fora do passo 5 | valor válido mais próximo (arredonda ao múltiplo de 5 e limita a 15..60; não numérico → 60) (FR-016, SC-005) |
| `warningMin` inválido | saneado conforme data-model (1..15 e menor que os dois limites) |
| `usedSeconds` negativo/não inteiro/acima do limite | `floor`, depois limitado a `0..limitMin×60` |
| `closure` desconhecido | `'nao-iniciado'` se não `exhausted`, senão `'em-andamento'` |
| `closureStyle` desconhecido | `'respiracao'` |
| Booleans não booleanos | padrão do campo |
| `nickname` não string ou > 18 caracteres | `null` / truncado em 18 |
| Registro de histórico inválido, duplicado ou com data ≥ `currentDay.date` | descartado |
| Campos desconhecidos | descartados |

Se o saneamento alterou algo, o documento saneado é regravado.

## Escrita (`update(fn)`)

1. Relê e saneia o documento atual (outra aba pode ter gravado).
2. Aplica `fn` (pura) e saneia o resultado.
3. Garante `currentDay.usedSeconds ≥ valor relido` no mesmo `date` (FR-015).
4. `setItem` único.
5. Falha (`QuotaExceededError`, `SecurityError`, armazenamento indisponível): o estado em memória
   é mantido, a interface do adulto mostra um aviso persistente ("Não foi possível salvar os dados
   neste aparelho") e a próxima gravação periódica tenta de novo (Edge Cases). Nada é apagado.

## Sincronização entre abas

Cada aba escuta `window` `storage` para a chave `tcc-cp:v1` e recarrega o documento (com `load`)
ao receber o evento; `newValue = null` significa que os dados foram apagados em outra aba → tela
`configuracao`. Só a aba com a trava `tcc-cp-contagem` conta tempo (R6).
