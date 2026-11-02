# Contrato — Arquivo exportado (FR-041, SC-010)

- **Gatilho**: botão "Exportar" na aba Registro.
- **Geração**: no próprio aparelho, a partir do documento saneado (`load`), sem requisição de rede.
- **Entrega**: download de `controle-parental-dados-AAAA-MM-DD.json` (data local do dia da
  exportação), tipo `application/json`, UTF-8, indentação de 2 espaços.

## Conteúdo

```json
{
  "formato": "controle-parental-exportacao",
  "versaoFormato": 1,
  "exportadoEm": "2026-11-01T20:15:00.000-03:00",
  "consentimento": { "aceitoEm": "2026-11-01T19:02:11.123-03:00", "versaoTexto": "1.0" },
  "crianca": { "apelido": "Lia" },
  "ajustes": {
    "limiteDiarioMinutos": 45,
    "avisoMinutos": 5,
    "estiloEncerramento": "respiracao",
    "sons": true,
    "voz": true,
    "menosAnimacao": false
  },
  "diaAtual": {
    "data": "2026-11-01",
    "segundosUsados": 1500,
    "limiteMinutos": 60,
    "avisoTocou": false,
    "conviteSupervisaoFeito": true,
    "encerramento": "nao-iniciado",
    "encerramentoPedidoPeloResponsavel": false
  },
  "historico": [
    { "data": "2026-10-30", "segundosUsados": 3600, "limiteMinutos": 60, "encerramentoAconteceu": true }
  ]
}
```

## Regras

- Chaves em português, para leitura pelo responsável (documento legível).
- Cada campo gravado no aparelho (contrato [storage-schema.md](storage-schema.md)) aparece no
  arquivo, **exceto** `credential` inteiro (algoritmo, iterações, sal e hash): nem a senha nem
  qualquer valor derivado dela é exportado (FR-043).
- `crianca.apelido` é `null` quando não informado.
- `historico` em ordem cronológica, como gravado; não inclui dias sem registro (os zeros são só
  de exibição).
- Teste (SC-010): para um documento conhecido, o JSON exportado é comparado campo a campo com o
  esperado e a serialização completa é verificada por não conter os valores de `salt` nem de
  `hash`, nem a chave `credential`.
