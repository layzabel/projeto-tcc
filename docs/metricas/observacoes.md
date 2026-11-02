# Observações sobre as métricas do projeto

> Arquivo mantido à mão. Complementa `consolidado.md`, que é regerado por
> `npm run metrics:consolidar` e não aceita observações.

## 001-quality-metrics-infra

- Sessão `e6b7f049-28ab-4f9a-88aa-264093976be1` (2026-10-31, `/speckit-taskstoissues`): aberta por
  acidente, não pertence a nenhuma etapa. Excluída da contagem: não há linha de IA para ela em
  `specs/001-quality-metrics-infra/metricas-ia.md`, e seus tokens e custo não entram no consolidado.

## 002-parental-screen-time

### Quickstart, Cenários 4, 5 e 6 (T116) — situação em 2026-11-02

Verificado automaticamente, dentro de `npm run verify` (`VERIFY OK: 5/5 etapas`, 452 testes
unitários e 54 de ponta a ponta no Chromium do Playwright, viewports 320 a 1280 px em retrato e
paisagem):

- **Cenário 4 (fluxos)**: configuração, mundo da criança, céu/vaga-lumes/aviso, encerramento nos
  três estilos, bloqueio após recarga, acesso adulto (3 s + senha, recuperação), "Encerrar agora"
  indisponível no dia encerrado, Registro com 7/30 dias, exportação sem credencial e "Apagar todos
  os dados" com `localStorage` vazio (`configuracao`, `contagem`, `encerramento`,
  `acesso-adulto`, `painel`, `atividades`, `supervisao`).
- **Cenário 5 (offline)**: service worker ativo, rede desligada, recarga e uso de configuração →
  mundo → jogo (`offline.spec.ts`). Ícones PNG 192/512 (`any` e `maskable`) e `apple-icon.png`
  presentes no manifest e na lista de cache do `sw.js`.
- **Cenário 6 (privacidade)**: a fixture `semRedeExterna` não apontou nenhuma requisição fora de
  `http://127.0.0.1:4310` em nenhum dos 54 testes. A escolha de voz só aceita
  `localService === true` com `lang` iniciando em `pt` (`tests/unit/app/platform/speech.test.ts`).

Pendente de conferência manual pelo responsável do projeto (não executável pelo agente):

- Cenário 4 num celular real (toque, vibração na senha errada, sons e voz do aparelho).
- Cenário 5: instalação na tela inicial no Chrome Android e no Safari iOS.
- Cenário 6: DevTools › Network com "Preserve log" percorrendo o Cenário 4, e a consulta de vozes
  locais em português no aparelho usado.
