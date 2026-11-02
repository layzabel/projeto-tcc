# Feature Specification: Aplicação de Controle Parental de Tempo de Tela

**Feature Branch**: `002-parental-screen-time`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Aplicação web de controle parental de tempo de tela para crianças de
2 a 5 anos, usada principalmente no celular, alinhada à recomendação da Sociedade Brasileira de
Pediatria (SBP): no máximo 1 hora de tela por dia nessa faixa etária, sempre com um adulto por
perto. O objetivo é ajudar a criança a entender, de forma lúdica e previsível, quando o tempo de
tela acaba, e dar ao responsável controle e acompanhamento desse tempo. O tempo é contado apenas
dentro da própria aplicação." A descrição completa, enviada no prompt do `/speckit-specify`, tem
11 seções (configuração inicial, mundo da criança, contagem do tempo, jogo, história, encerramento,
bloqueio, acesso adulto, painel do responsável, dados e privacidade, adequação à idade), além de
"Fora do escopo" e "Contexto do projeto": a feature usa a infraestrutura da
`001-quality-metrics-infra`, o comando único de verificação deve passar ao final e todos os
critérios de sucesso devem ser verificáveis por testes automatizados ou pelo checklist de
aceitação, sem testes com usuários.

## User Scenarios & Testing *(mandatory)*

Os atores são o **responsável** (adulto que configura e acompanha) e a **criança** de 2 a 5 anos,
que não lê e usa apenas as telas infantis. Há uma única criança por aparelho. Um **mascote
vaga-lume** guia a criança; ele tem os humores feliz, calmo, com sono, dormindo e festejando, fala
em balões e pode falar em voz alta.

Telas infantis: mundo da criança, jogo, história, encerramento e bloqueio. Telas do adulto:
configuração inicial, acesso à área dos adultos (senha e recuperação) e painel do responsável.

### User Story 1 - Configuração inicial com consentimento (Priority: P1)

No primeiro uso, o responsável vê as boas-vindas com o propósito da aplicação, lê o texto de
consentimento para o tratamento dos dados da criança e o aceita. Em seguida informa, se quiser, o
nome ou apelido da criança, escolhe o limite diário (15 a 60 minutos, padrão 60, com a
recomendação da SBP exibida), cria uma senha de 4 números com confirmação e chega à tela de
conclusão, que leva ao mundo da criança.

**Why this priority**: sem consentimento e sem configuração a aplicação não pode ser usada; é a
porta de entrada exigida pela LGPD (Constituição, Princípio I).

**Independent Test**: com o armazenamento do aparelho vazio, percorrer o fluxo completo e
verificar que o consentimento é registrado antes de qualquer outro dado, que os valores escolhidos
ficam salvos e que a aplicação abre no mundo da criança ao final.

**Acceptance Scenarios**:

1. **Given** o primeiro acesso, **When** a aplicação abre, **Then** a tela de boas-vindas é
   exibida e nenhuma tela infantil fica acessível.
2. **Given** a tela de consentimento, **When** o responsável não aceita, **Then** a configuração
   não avança e nenhum dado é gravado no aparelho.
3. **Given** a tela de consentimento, **When** o responsável aceita, **Then** o aceite é gravado
   com data, hora e versão do texto antes de qualquer outro dado.
4. **Given** o campo de nome, **When** o responsável digita mais de 18 caracteres, **Then** o
   campo não aceita os caracteres excedentes; **When** deixa vazio, **Then** pode avançar.
5. **Given** a escolha do limite, **When** a tela abre, **Then** o valor inicial é 60 minutos, a
   recomendação da SBP aparece e só são selecionáveis os valores 15, 20, 25, ..., 60.
6. **Given** a criação de senha, **When** a confirmação difere da senha, **Then** uma mensagem
   de erro aparece e a senha não é gravada; **When** coincide, **Then** a senha é gravada em forma
   não legível.
7. **Given** a tela de conclusão, **When** o responsável toca para continuar, **Then** o mundo da
   criança é exibido.
8. **Given** a configuração interrompida antes da conclusão, **When** a aplicação é reaberta,
   **Then** a configuração recomeça e o mundo da criança não fica acessível.

---

### User Story 2 - Mundo da criança e contagem do tempo (Priority: P1)

A criança vê o mascote e três botões grandes com ícone: Brincar, História e Mascote. O tempo
restante aparece sem números: o céu passa de dia para tarde e para anoitecer, o sol desce, surgem
estrelas e cinco vaga-lumes se apagam um a um; o humor do mascote acompanha (feliz, calmo, com
sono). Alguns minutos antes do fim, um som de aviso toca e o mascote, com sono, diz que falta
pouquinho. O tempo só corre enquanto a criança está numa tela infantil com a aplicação visível.

**Why this priority**: é o propósito central do produto: contar o tempo corretamente e torná-lo
compreensível para quem não lê (Constituição, Princípios III e IV).

**Independent Test**: com a configuração já concluída e o relógio controlado por teste, simular a
passagem do tempo nas telas infantis, em segundo plano e na área do adulto, e verificar o tempo
contado, o estado visual, o aviso de "falta pouco" e a persistência após recarga.

**Acceptance Scenarios**:

1. **Given** o mundo da criança com nome configurado, **When** a tela abre, **Then** o mascote
   cumprimenta a criança pelo nome; sem nome, o cumprimento é genérico.
2. **Given** o mundo da criança, **When** a criança toca no botão Mascote, **Then** o mascote
   responde com uma frase carinhosa sorteada de um conjunto fixo.
3. **Given** limite de 60 minutos, **When** 12 minutos são consumidos, **Then** um dos cinco
   vaga-lumes se apaga; a cada 20% adicionais do limite consumidos, apaga-se mais um.
4. **Given** aviso configurado em 5 minutos, **When** faltam 5 minutos, **Then** o som de aviso
   toca uma vez (mesmo com sons desligados), o mascote fica com sono e diz que falta pouquinho (em
   voz alta se a voz estiver ligada), e um texto complementar com os minutos restantes pode
   aparecer.
5. **Given** a criança em uma tela infantil, **When** a aplicação vai para segundo plano por 10
   minutos e volta, **Then** esses 10 minutos não são contados.
6. **Given** a criança com 20 minutos usados, **When** a aplicação é fechada e reaberta no mesmo
   dia, **Then** o tempo usado continua em 20 minutos (tolerância: o intervalo de gravação
   periódica).
7. **Given** a contagem em andamento, **When** o relógio do aparelho salta 2 horas para frente
   ou 1 hora para trás, **Then** o tempo usado avança no máximo o intervalo real decorrido e
   nunca diminui.
8. **Given** o dia com tempo usado, **When** o relógio passa da meia-noite, **Then** o dia
   anterior é arquivado no histórico e o novo dia começa com tempo zero, liberado.
9. **Given** o limite alterado para 30 minutos hoje, **When** o dia ainda não virou, **Then** o
   limite de hoje continua o anterior; **When** o dia vira, **Then** o novo dia usa 30 minutos.

---

### User Story 3 - Encerramento lúdico e bloqueio (Priority: P1)

Quando o tempo acaba, ou quando o responsável aciona "Encerrar agora", começa o encerramento: som
de aviso, o mascote avisa (pelo nome) que chegou a hora de guardar a tela, conduz a etapa do
estilo escolhido (Respiração, Historinha ou Simples), elogia a criança, oferece quatro cartões de
atividades do mundo real, se despede e a tela fica bloqueada até o dia seguinte.

**Why this priority**: o encerramento calmo e o bloqueio fazem cumprir o limite; sem eles o
produto não cumpre a recomendação da SBP (Constituição, Princípios III e IV).

**Independent Test**: com o relógio controlado, esgotar o limite em cada um dos três estilos e
verificar a sequência de etapas, a ausência de contagem durante o encerramento, o bloqueio
persistente após recarga e a liberação automática na virada do dia.

**Acceptance Scenarios**:

1. **Given** o tempo do dia esgotado em qualquer tela infantil, **When** o limite é atingido,
   **Then** o encerramento começa automaticamente e a contagem para.
2. **Given** o estilo Respiração, **When** o encerramento roda, **Then** a sequência é: aviso,
   3 respirações guiadas (inspira e solta), elogio, escolha de atividade, despedida, bloqueio.
3. **Given** o estilo Historinha, **When** o encerramento roda, **Then** a história de 6
   páginas é contada entre o aviso e o elogio.
4. **Given** o estilo Simples, **When** o encerramento roda, **Then** o aviso é seguido
   diretamente pelo elogio.
5. **Given** a etapa de escolha, **When** a criança toca um dos quatro cartões (brinquedo,
   desenhar, abraço em quem cuida de você, livro), **Then** o mascote reage à escolha e segue para
   a despedida.
6. **Given** o encerramento em andamento, **When** ele é reiniciado (recarga da página ou volta
   da área do adulto), **Then** recomeça do início e nenhuma etapa, som ou fala da execução
   anterior continua.
7. **Given** a tela bloqueada, **When** a aplicação é recarregada no mesmo dia, **Then** continua
   bloqueada e nenhuma tela infantil é acessível.
8. **Given** a tela bloqueada, **When** o relógio passa da meia-noite com a aplicação aberta,
   **Then** a tela é liberada automaticamente e o mundo da criança aparece.
9. **Given** a tela bloqueada ou o encerramento em andamento, **When** o adulto usa "sou o
   adulto", **Then** o acesso à área dos adultos é oferecido, e nada lá dentro libera tempo extra.

---

### User Story 4 - Acesso protegido à área dos adultos (Priority: P2)

O responsável segura um botão discreto por 3 segundos (com preenchimento visual), digita a senha
de 4 números num teclado numérico próprio e entra no painel. Se esquecer a senha, resolve uma
conta de multiplicação e cria uma nova senha.

**Why this priority**: impede que a criança altere ajustes ou encerre o controle (Constituição,
Princípio I, bloqueio adulto); depende da configuração já existir.

**Independent Test**: em cada tela de origem (mundo da criança, encerramento, bloqueio), segurar o
botão por menos e por mais de 3 segundos, digitar senhas certas e erradas e usar a recuperação,
verificando o destino de cada caminho.

**Acceptance Scenarios**:

1. **Given** o botão de acesso adulto, **When** é solto antes de 3 segundos, **Then** o
   preenchimento volta a zero e nada acontece; **When** é segurado por 3 segundos, **Then** o
   teclado de senha aparece.
2. **Given** o teclado de senha, **When** a senha correta é digitada, **Then** o painel do
   responsável abre e a contagem do tempo fica pausada.
3. **Given** o teclado de senha, **When** uma senha errada é digitada, **Then** uma mensagem de
   erro aparece, o aparelho vibra (quando houver suporte) e os dígitos são limpos.
4. **Given** "Esqueci a senha", **When** o responsável responde corretamente uma multiplicação
   gerada aleatoriamente e cria e confirma uma nova senha, **Then** a nova senha passa a valer e a
   antiga deixa de valer; **When** responde errado, **Then** uma nova conta é gerada e a senha não
   muda.
5. **Given** o acesso aberto a partir do mundo da criança, do encerramento ou do bloqueio,
   **When** o responsável toca em voltar, **Then** retorna à tela adequada ao estado atual do dia
   (mundo da criança se há tempo, encerramento se o tempo acabou sem encerramento concluído,
   bloqueio se o encerramento já ocorreu).

---

### User Story 5 - Painel do responsável: Hoje e Ajustes (Priority: P2)

Na aba Hoje, o responsável vê um indicador circular do tempo usado em relação ao limite, o tempo
que falta, o estado do dia e se o encerramento já aconteceu, e pode acionar "Encerrar agora". Na
aba Ajustes, altera limite, aviso, estilo do encerramento, sons, voz, menos animação, nome da
criança e senha, ou apaga todos os dados.

**Why this priority**: dá ao responsável o controle previsto na descrição; o produto já cumpre o
limite sem ele, usando os valores da configuração inicial.

**Independent Test**: com dados de uso preparados, abrir cada aba, alterar cada ajuste e verificar
o efeito correspondente nas telas infantis e no armazenamento.

**Acceptance Scenarios**:

1. **Given** 25 de 60 minutos usados, **When** a aba Hoje abre, **Then** o indicador mostra
   25/60, o tempo que falta é 35 minutos, o estado é "em uso" e o encerramento aparece como não
   ocorrido.
2. **Given** a aba Hoje com tempo disponível, **When** o responsável aciona "Encerrar agora" e
   confirma (ciente de que o bloqueio vale até o dia seguinte), **Then** a área do adulto fecha e o
   encerramento começa; **When** cancela, **Then** nada muda.
3. **Given** o dia já encerrado, **When** a aba Hoje abre, **Then** "Encerrar agora" não está
   disponível e o estado é "encerrado".
4. **Given** a aba Ajustes, **When** o responsável escolhe o aviso, **Then** só são aceitos
   valores de 1 a 15 minutos menores que o limite de hoje e que o limite que valerá amanhã.
5. **Given** sons desligados, **When** a criança usa o jogo, **Then** os sons de acerto não
   tocam, mas os sons de "falta pouco" e de fim de tempo continuam tocando.
6. **Given** voz desligada, **When** o mascote fala, **Then** a fala aparece só no balão, sem
   áudio.
7. **Given** "menos animação" ligado (ou a preferência de movimento reduzido do aparelho),
   **When** as telas infantis exibem transições e efeitos, **Then** usam versões estáticas ou
   curtas, sem movimento contínuo.
8. **Given** "Trocar a senha", **When** a senha atual informada está errada, **Then** a troca é
   recusada.
9. **Given** "Apagar todos os dados", **When** o responsável confirma, **Then** todos os dados,
   inclusive o consentimento e o tempo usado hoje, são apagados e a configuração inicial
   recomeça.
10. **Given** qualquer aba do painel, **When** é exibida, **Then** a recomendação da SBP está
    visível.

---

### User Story 6 - Registro, exportação e direitos sobre os dados (Priority: P3)

Na aba Registro, o responsável vê um gráfico de barras dos últimos 7 dias, a média diária, a
sequência de dias seguidos de uso, o total da semana e o histórico dos últimos 30 dias, e pode
exportar todos os dados em arquivo.

**Why this priority**: acompanhamento e direito de acesso aos dados (LGPD); útil, mas não
necessário para o controle diário.

**Independent Test**: preparar um histórico conhecido de 40 dias, abrir a aba Registro e comparar
os valores exibidos e o conteúdo do arquivo exportado com os valores esperados.

**Acceptance Scenarios**:

1. **Given** um histórico conhecido, **When** a aba Registro abre, **Then** o gráfico mostra uma
   barra por dia dos últimos 7 dias (hoje incluído), em minutos, com zero nos dias sem uso.
2. **Given** um histórico conhecido, **When** o resumo é exibido, **Then** o total da semana é a
   soma dos 7 dias, a média é esse total dividido por 7 e a sequência é o número de dias seguidos
   com uso maior que zero terminando hoje (ou ontem, se hoje ainda não houve uso).
3. **Given** dias com mais de 30 dias de idade armazenados, **When** a aplicação abre ou o dia
   vira, **Then** esses dias são apagados e não aparecem no histórico.
4. **Given** "Exportar", **When** o responsável aciona, **Then** um arquivo é salvo no aparelho
   contendo consentimento, nome, ajustes, dia atual e histórico, sem a senha nem seu valor
   derivado.

---

### User Story 7 - Jogo "Guardar os brinquedos" (Priority: P3)

A criança toca num brinquedo e depois na caixa da mesma cor (azul ou vermelha). Na caixa certa, o
brinquedo é guardado com som de acerto; na errada, ele volta para o lugar e o mascote incentiva a
tentar de novo. Ao guardar os seis, o mascote comemora e a criança volta ao mundo da criança.

**Why this priority**: atividade que dá conteúdo ao tempo de tela; o controle funciona sem ela.

**Independent Test**: abrir o jogo com sorteio controlado, executar acertos e erros e verificar
progresso, sons, falas e retorno automático.

**Acceptance Scenarios**:

1. **Given** o jogo aberto, **When** a tela aparece, **Then** há seis brinquedos em ordem
   aleatória, cada um azul ou vermelho, e duas caixas, uma de cada cor.
2. **Given** um brinquedo selecionado, **When** a criança toca a caixa da mesma cor, **Then** o
   brinquedo é guardado, o som de acerto toca (se sons ligados) e o indicador de progresso avança.
3. **Given** um brinquedo selecionado, **When** a criança toca a caixa da outra cor, **Then** o
   brinquedo volta ao lugar, o mascote incentiva a tentar de novo, não há som de erro e o progresso
   não diminui.
4. **Given** o sexto brinquedo guardado, **When** o jogo termina, **Then** o mascote comemora
   (humor festejando) e a aplicação volta sozinha ao mundo da criança.
5. **Given** o jogo em andamento, **When** a criança toca o botão de voltar, **Then** retorna ao
   mundo da criança.

---

### User Story 8 - História interativa (Priority: P3)

A criança abre uma história de 6 páginas sobre o mascote se preparando para descansar. Cada página
tem um cenário, uma frase lida em voz alta e uma dica de toque; o primeiro toque provoca um
efeito e o segundo avança.

**Why this priority**: atividade e também etapa do estilo Historinha do encerramento (User Story
3).

**Independent Test**: abrir a história pelo mundo da criança e percorrer as 6 páginas com toques,
verificando cenário, frase, efeito e avanço em cada uma.

**Acceptance Scenarios**:

1. **Given** a história aberta pelo mundo da criança, **When** cada página aparece, **Then**
   mostra um cenário (dia, tarde, anoitecer ou noite), a frase (lida em voz alta se a voz estiver
   ligada) e uma dica visual de toque.
2. **Given** uma página, **When** a criança toca pela primeira vez, **Then** o efeito da página
   acontece (risada, luz enfraquecendo, bocejo, respiração guiada, flores nascendo ou dormir);
   **When** toca de novo, **Then** avança para a próxima página.
3. **Given** a sexta página concluída, **When** a história foi aberta pelo mundo da criança,
   **Then** volta ao mundo da criança; **When** faz parte do encerramento, **Then** segue para o
   elogio.

---

### Edge Cases

- **Tempo acaba dentro do jogo ou da história**: o encerramento começa imediatamente, sem esperar
  o fim da atividade.
- **"Apagar todos os dados" no meio do dia**: após a nova configuração, o dia começa com tempo
  zero (a exclusão é total, conforme a descrição).
- **Aplicação fechada durante o encerramento**: na reabertura no mesmo dia, como o tempo está
  esgotado e o encerramento não terminou, o encerramento recomeça do início.
- **Aplicação fechada durante "Encerrar agora" já confirmado**: a decisão de encerrar é gravada
  na confirmação; na reabertura, o encerramento recomeça.
- **Aplicação aberta pela primeira vez no dia depois de dias sem uso**: os dias sem uso entram
  no histórico e no gráfico como zero; nenhum dia é inventado com uso.
- **Relógio do aparelho atrasado para um dia anterior ao dia atual registrado**: o dia atual não é
  reaberto nem arquivado de novo; a contagem continua no dia registrado até a data do aparelho
  superar esse dia.
- **Limite reduzido para um valor menor que o tempo já usado hoje**: não afeta hoje; amanhã vale o
  novo limite a partir de zero.
- **Aviso maior ou igual ao limite que valerá amanhã**: o ajuste do limite é recusado com
  mensagem explicando que o aviso precisa ser reduzido antes.
- **Aviso disparado quando o tempo restante já começa abaixo dele** (por exemplo, reabertura com
  2 minutos restantes e aviso de 5): o aviso toca uma vez ao entrar no mundo da criança; nunca
  toca mais de uma vez por dia.
- **Mais de uma aba ou janela da aplicação aberta**: o tempo usado não é contado em dobro.
- **Áudio bloqueado pelo navegador até a primeira interação**: os sons obrigatórios tocam assim
  que o navegador permitir; a mudança visual do mascote acontece de qualquer forma.
- **Vibração não suportada pelo aparelho**: a mensagem de erro de senha aparece sem vibração.
- **Armazenamento do aparelho indisponível ou cheio**: a aplicação informa o responsável na área
  dos adultos; não perde silenciosamente o tempo já gravado.
- **Retirada do consentimento**: equivale a "Apagar todos os dados" e leva à configuração inicial.

## Requirements *(mandatory)*

### Functional Requirements

**Configuração inicial e consentimento**

- **FR-001**: No primeiro uso (ou após apagar os dados), a aplicação MUST exibir a configuração
  inicial e MUST impedir o acesso a qualquer outra tela até que ela seja concluída.
- **FR-002**: A configuração MUST apresentar, em destaque e em linguagem simples, quais dados da
  criança são tratados, para quê, que ficam só no aparelho e como apagá-los, e MUST exigir o
  aceite explícito do responsável antes de gravar qualquer dado.
- **FR-003**: O aceite MUST ser gravado com data, hora e versão do texto de consentimento. Sem
  aceite, nenhum dado é gravado e a configuração não avança.
- **FR-004**: A configuração MUST coletar: nome ou apelido da criança (opcional, até 18
  caracteres), limite diário (15 a 60 minutos em passos de 5, padrão 60, com a recomendação da SBP
  exibida) e senha de 4 dígitos numéricos digitada duas vezes, e MUST terminar numa tela de
  conclusão que leva ao mundo da criança.

**Mundo da criança e mascote**

- **FR-005**: O mundo da criança MUST exibir o mascote e três botões grandes com ícone: Brincar
  (abre o jogo), História (abre a história) e Mascote (o mascote responde com uma frase carinhosa
  sorteada de um conjunto fixo de pelo menos 5 frases).
- **FR-006**: O mascote MUST cumprimentar a criança pelo nome quando houver nome; caso contrário,
  MUST usar um cumprimento genérico.
- **FR-007**: O tempo restante MUST ser comunicado nas telas infantis sem números, por: fase do
  céu (dia enquanto restam mais de 2/3 do limite, tarde entre 2/3 e 1/3, anoitecer abaixo de 1/3),
  posição do sol, estrelas no anoitecer e cinco vaga-lumes, apagando-se um a cada 20% do limite
  consumido.
- **FR-008**: O humor do mascote no mundo da criança MUST ser feliz enquanto resta mais da metade
  do limite, calmo entre a metade e o aviso de "falta pouco" e com sono a partir do aviso.
- **FR-009**: Quando o tempo restante atingir o valor do aviso configurado, a aplicação MUST tocar
  o som de aviso, deixar o mascote com sono e fazê-lo dizer que falta pouquinho (em voz alta se a
  voz estiver ligada). Um texto com os minutos restantes MAY aparecer como complemento para o
  adulto. O aviso MUST ocorrer no máximo uma vez por dia.
- **FR-010**: O mundo da criança MUST ter, num canto, o botão discreto de acesso à área dos
  adultos (FR-030).

**Contagem do tempo**

- **FR-011**: O tempo MUST ser contado somente quando, ao mesmo tempo: a tela atual é infantil de
  uso (mundo da criança, jogo ou história fora do encerramento), a aplicação está visível e ainda
  há tempo disponível no dia.
- **FR-012**: A contagem MUST pausar com a aplicação em segundo plano ou oculta, na área dos
  adultos (inclusive na tela de senha), durante o encerramento e no bloqueio.
- **FR-013**: A contagem MUST basear-se em intervalos medidos por um relógio que não volta para
  trás; cada intervalo acrescentado MUST ser limitado a um teto de 5 segundos, de modo
  que saltos no relógio do aparelho, suspensão do aparelho ou travamentos não somem tempo nem o
  subtraiam.
- **FR-014**: O tempo usado MUST ser gravado no aparelho periodicamente (no máximo a cada 5
  segundos de contagem) e ao sair da tela ou ocultar a aplicação; fechar e reabrir no mesmo dia
  MUST manter o tempo usado, com perda máxima igual a esse intervalo.
- **FR-015**: O tempo usado no dia MUST nunca diminuir nem ser zerado durante o dia, exceto por
  "Apagar todos os dados" ou retirada do consentimento; não existe ação de tempo extra, bônus ou
  liberação manual.
- **FR-016**: O limite diário MUST estar sempre entre 15 e 60 minutos; qualquer valor fora disso,
  inclusive vindo de dados gravados adulterados, MUST ser rejeitado e substituído pelo valor
  válido mais próximo.
- **FR-017**: Uma alteração do limite diário MUST valer a partir do dia seguinte; o limite do dia
  em curso é fixado no início do dia.
- **FR-018**: A virada do dia MUST seguir a meia-noite no fuso horário do aparelho e ser detectada
  tanto com a aplicação aberta quanto na reabertura: o dia anterior é arquivado no histórico com
  total usado, limite vigente e se o encerramento aconteceu, e o novo dia começa com tempo zero e
  liberado.
- **FR-019**: Se a data do aparelho ficar anterior ao dia atual registrado, a aplicação MUST
  continuar no dia registrado, sem reabrir nem arquivar dias.
- **FR-020**: Com várias abas ou janelas abertas, o tempo MUST ser contado uma única vez.

**Jogo "Guardar os brinquedos"**

- **FR-021**: O jogo MUST exibir seis brinquedos em ordem aleatória, cada um azul ou vermelho, e
  duas caixas (azul e vermelha), com pelo menos um brinquedo de cada cor.
- **FR-022**: A interação MUST ser tocar no brinquedo e depois na caixa. Caixa da mesma cor:
  brinquedo guardado, som de acerto e avanço do indicador de progresso. Caixa de outra cor:
  brinquedo volta ao lugar e o mascote incentiva a tentar de novo, sem som de erro, sem perda de
  progresso e sem qualquer penalidade.
- **FR-023**: Ao guardar os seis brinquedos, o mascote MUST comemorar e a aplicação MUST voltar
  sozinha ao mundo da criança em poucos segundos; um botão de voltar MUST estar sempre disponível.

**História interativa**

- **FR-024**: A história MUST ter 6 páginas sobre o mascote se preparando para descansar; cada
  página com cenário (dia, tarde, anoitecer ou noite), frase curta lida em voz alta quando a voz
  estiver ligada, dica visual de toque e um efeito próprio (risada, luz enfraquecendo, bocejo,
  respiração guiada, flores nascendo, dormir).
- **FR-025**: Em cada página, o primeiro toque MUST disparar o efeito e o toque seguinte MUST
  avançar. Ao fim, a história MUST voltar ao mundo da criança, ou seguir para o elogio quando
  fizer parte do encerramento.

**Encerramento lúdico e bloqueio**

- **FR-026**: O encerramento MUST começar automaticamente quando o tempo do dia se esgota ou após
  o responsável confirmar "Encerrar agora". O bloqueio MUST ser alcançável somente pelo fim do
  encerramento (ou, na reabertura, a partir de um dia cujo encerramento já foi concluído).
- **FR-027**: O encerramento MUST seguir a ordem: (1) som de aviso e fala do mascote, com o nome
  da criança quando houver, dizendo que é hora de guardar a tela; (2) etapa do estilo escolhido:
  Respiração (3 ciclos guiados de inspirar e soltar), Historinha (a história de FR-024) ou Simples
  (sem etapa); (3) elogio ("você brincou muito bem hoje") e o mascote vai descansar; (4) escolha
  entre quatro cartões com ícone (brincar com um brinquedo, desenhar, dar um abraço em quem cuida
  de você, ver um livro); (5) despedida ("até amanhã"); (6) bloqueio.
- **FR-028**: Ao reiniciar o encerramento, qualquer etapa, temporizador, som ou fala da execução
  anterior MUST ser cancelado; apenas uma execução pode estar ativa.
- **FR-029**: A tela de bloqueio MUST mostrar o céu noturno com o mascote dormindo e a mensagem de
  que a tela foi descansar, e MAY mostrar, como complemento para o adulto, o tempo até a
  meia-noite. O bloqueio MUST persistir a recargas no mesmo dia e MUST terminar sozinho na virada
  do dia, inclusive com a aplicação aberta.

**Acesso à área dos adultos**

- **FR-030**: O mundo da criança, todas as etapas do encerramento e o bloqueio MUST ter o acesso
  "sou o adulto": um botão que só aciona após ser mantido pressionado por 3 segundos contínuos,
  com preenchimento visual do progresso, que volta a zero se soltar antes.
- **FR-031**: Após o botão, a aplicação MUST pedir a senha de 4 dígitos num teclado numérico
  próprio da aplicação. Senha correta abre o painel; senha errada mostra mensagem de erro, vibra
  o aparelho quando houver suporte e limpa os dígitos.
- **FR-032**: "Esqueci a senha" MUST apresentar uma multiplicação gerada aleatoriamente de um
  número de dois dígitos por um de um dígito (fatores de 12 a 19 e de 3 a 9); resposta correta
  permite criar e confirmar uma nova senha, resposta errada gera nova conta. Nenhum dado pessoal é
  pedido ou usado.
- **FR-033**: Voltar da área dos adultos MUST levar à tela coerente com o estado: configuração
  inicial (se não concluída), mundo da criança (se há tempo), encerramento (se o tempo acabou ou
  "Encerrar agora" foi confirmado e o encerramento não terminou) ou bloqueio (se o encerramento
  terminou).

**Painel do responsável**

- **FR-034**: O painel MUST ter três abas: Hoje, Ajustes e Registro, e MUST mostrar a recomendação
  da SBP em todas elas.
- **FR-035**: A aba Hoje MUST mostrar indicador circular do tempo usado em relação ao limite de
  hoje, tempo restante em minutos, estado do dia (em uso ou encerrado) e se o encerramento já
  aconteceu, e MUST oferecer "Encerrar agora" com confirmação explicando que o bloqueio vale até
  o dia seguinte; a ação MUST ficar indisponível em dia já encerrado.
- **FR-036**: A aba Ajustes MUST permitir: limite diário (15 a 60, passos de 5, valendo amanhã,
  com indicação de qual limite vale hoje e qual valerá amanhã); aviso antes de acabar (1 a 15
  minutos, padrão 5, sempre menor que o limite de hoje e o de amanhã); estilo do encerramento
  (Respiração padrão, Historinha ou Simples); liga e desliga de sons (padrão ligado), voz do
  mascote (padrão ligada) e menos animação (padrão desligado); alterar o nome da criança; trocar a
  senha mediante a senha atual; e apagar todos os dados com confirmação.
- **FR-037**: Com sons desligados, MUST silenciar os sons de efeito (acerto, reações, efeitos da
  história), mas os sons de aviso de "falta pouco" e de fim de tempo MUST tocar sempre.
- **FR-038**: Com "menos animação" ligado, ou com a preferência de movimento reduzido do aparelho
  ativa, as telas infantis MUST substituir animações contínuas por estados estáticos ou transições
  curtas, mantendo todas as informações.
- **FR-039**: "Apagar todos os dados" MUST remover tudo o que a aplicação guarda no aparelho,
  inclusive consentimento e tempo usado hoje, e reiniciar na configuração inicial.
- **FR-040**: A aba Registro MUST mostrar: gráfico de barras dos últimos 7 dias (hoje incluído) em
  minutos; média diária (total dos 7 dias ÷ 7); sequência de dias seguidos com uso maior que zero
  terminando hoje, ou ontem se hoje ainda não houve uso; total da semana; histórico dos últimos 30
  dias com data e minutos usados; e a ação de exportar.
- **FR-041**: A exportação MUST gerar, no próprio aparelho, um arquivo em formato estruturado e
  legível contendo todos os dados guardados (consentimento, nome, ajustes, dia atual, histórico),
  exceto a senha e seu valor derivado.

**Dados e privacidade**

- **FR-042**: A aplicação MUST guardar somente: registro do consentimento, nome ou apelido
  (opcional), ajustes, senha em forma não reversível, dia atual (data, tempo usado, limite
  vigente, se o aviso tocou, se o encerramento começou ou terminou) e histórico dos últimos 30
  dias (data, total usado, limite vigente, se o encerramento aconteceu). Nenhum outro dado da
  criança ou do aparelho é coletado.
- **FR-043**: A senha MUST ser guardada só em forma derivada não reversível, nunca em texto
  legível, e MUST NOT aparecer na exportação.
- **FR-044**: Dias com mais de 30 dias MUST ser apagados automaticamente na abertura e na virada
  do dia.
- **FR-045**: O responsável MUST poder retirar o consentimento no painel; a retirada MUST ter o
  mesmo efeito de FR-039.
- **FR-046**: Nenhum dado MUST sair do aparelho: nenhuma requisição de rede com dados, sem
  cadastro, conta, login online, analytics, anúncios, recursos de terceiros ou links externos.
- **FR-047**: Após o primeiro acesso com internet, a aplicação MUST funcionar totalmente sem
  internet e MUST poder ser adicionada à tela inicial do celular.

**Adequação à idade e acessibilidade**

- **FR-048**: Toda ação das telas infantis MUST ser possível sem leitura, por ícones, cores,
  imagens e áudio; textos nessas telas são apenas complemento para o adulto.
- **FR-049**: Todo alvo de toque das telas infantis MUST medir no mínimo 64×64 px, com pelo menos
  8 px entre alvos, em todas as larguras suportadas.
- **FR-050**: As telas infantis MUST NOT conter links externos, compras, anúncios, reprodução
  automática infinita, pontos, recompensas por tempo de uso ou convites a continuar, e MUST NOT
  ter elementos que pisquem mais de 3 vezes por segundo.
- **FR-051**: O layout MUST ser pensado para celular em retrato e MUST funcionar de 320 px de
  largura até telas de computador, em retrato e paisagem, sem perda de função.
- **FR-052**: As telas do adulto MUST atender WCAG 2.1 nível AA; as telas infantis MUST atender o
  contraste mínimo AA.
- **FR-053**: Textos da interface MUST estar em português do Brasil.

**Qualidade do projeto**

- **FR-054**: A feature MUST usar a infraestrutura da `001-quality-metrics-infra`: o comando único
  de verificação MUST passar ao final, a análise SonarQube MUST ser executada e o arquivo
  `metricas-ia.md` da feature MUST ser mantido conforme a Constituição (Princípios V e VI).
- **FR-055**: A lógica de domínio (contagem de tempo, virada do dia, limites, aviso, encerramento,
  consentimento, senha e retenção) MUST ter testes automatizados; os fluxos do responsável e o
  bloqueio ao atingir o limite MUST ter testes de ponta a ponta.

### Key Entities

- **Consentimento**: aceite do responsável; data e hora, versão do texto aceito.
- **Perfil da criança**: nome ou apelido opcional (até 18 caracteres). Um único por aparelho.
- **Ajustes**: limite diário de hoje, limite pendente para amanhã, aviso antes de acabar, estilo
  do encerramento, sons, voz, menos animação.
- **Credencial do adulto**: senha de 4 dígitos guardada só em forma derivada não reversível.
- **Dia atual**: data local, tempo usado (em segundos), limite vigente, aviso já tocado, estado do
  encerramento (não iniciado, em andamento, concluído) e se foi pedido pelo responsável.
- **Registro diário (histórico)**: data, total usado, limite vigente, se o encerramento
  aconteceu. Até 30 registros.
- **Conteúdo fixo**: frases carinhosas do mascote, 6 brinquedos e 2 caixas do jogo, 6 páginas da
  história, 4 cartões de atividade do mundo real, falas do encerramento. Não são dados pessoais.

## Success Criteria *(mandatory)*

Todos os critérios são verificáveis por teste automatizado (unitário ou de ponta a ponta, com
relógio e armazenamento controlados) ou pelo checklist de aceitação; não há testes com usuários.

### Measurable Outcomes

- **SC-001**: Em 100% dos cenários de teste, nenhum dado é gravado antes do aceite do
  consentimento e nenhuma tela infantil é alcançável sem configuração concluída.
- **SC-002**: Em simulação de 60 minutos de uso infantil intercalados com pausas (segundo plano,
  área do adulto), o tempo contado difere do tempo infantil visível real em no máximo 5 segundos.
- **SC-003**: Saltos simulados no relógio do aparelho de +2 h, −1 h e +24 h alteram o tempo
  usado em no máximo 5 segundos e nunca o reduzem.
- **SC-004**: Após recarga da aplicação no mesmo dia, o tempo usado é recuperado com perda máxima
  de 5 segundos em 100% dos testes; após virada da meia-noite, o novo dia começa em zero e o dia
  anterior aparece no histórico com os valores corretos.
- **SC-005**: Em 100% dos testes, nenhuma configuração resulta em limite diário acima de 60
  minutos ou abaixo de 15, inclusive com dados gravados adulterados.
- **SC-006**: Para cada um dos três estilos, o encerramento percorre todas as etapas na ordem
  definida e termina no bloqueio; reiniciado no meio, nenhuma etapa da execução anterior produz
  efeito.
- **SC-007**: Em 100% dos testes, o bloqueio persiste após recarga no mesmo dia, nenhuma ação na
  área do adulto concede tempo extra, e a tela é liberada automaticamente na virada do dia.
- **SC-008**: O acesso adulto só abre após 3 segundos contínuos de pressão e senha correta; a
  recuperação por multiplicação troca a senha sem usar dado pessoal.
- **SC-009**: Os valores da aba Registro (7 barras, média, sequência, total, 30 dias) coincidem
  com os valores esperados para um histórico de teste conhecido, e dias com mais de 30 dias não
  existem no armazenamento.
- **SC-010**: O arquivo exportado contém todos os dados guardados e não contém a senha nem seu
  valor derivado; após "Apagar todos os dados" ou retirada do consentimento, o armazenamento da
  aplicação fica vazio.
- **SC-011**: Durante toda a execução da suíte de ponta a ponta, zero requisições de rede saem
  para fora da própria aplicação, e a aplicação abre e funciona com a rede desligada após o
  primeiro carregamento.
- **SC-012**: 100% dos alvos de toque das telas infantis medem ao menos 64×64 px com 8 px de
  espaçamento, verificados nas larguras de 320 px, 390 px e 1280 px.
- **SC-013**: A verificação automatizada de acessibilidade não aponta violações de nível AA nas
  telas do adulto nem de contraste nas telas infantis.
- **SC-014**: O comando único de verificação da `001-quality-metrics-infra` termina com sucesso e
  o Quality Gate do SonarQube está aprovado ao final da feature.

## Assumptions

- **Sem branch nova**: o projeto não tem o hook de branch configurado; a feature é criada só como
  diretório `specs/002-parental-screen-time`.
- **Faixas visuais e de humor**: os limiares de céu (2/3 e 1/3), vaga-lumes (a cada 20%) e humor
  (metade e aviso) são escolhas de projeto para tornar o comportamento testável; a descrição só
  fixa a ordem das fases.
- **Teto por intervalo**: "salto anormal" é tratado limitando cada intervalo de contagem a 5
  segundos. Como avanços de data para o futuro são
  indistinguíveis de uso legítimo, adiantar a data do aparelho vira o dia; o público adulto é o
  único capaz de fazê-lo e a ação não aumenta o limite diário.
- **Sequência no painel**: a "sequência de dias seguidos de uso" aparece só no painel do adulto,
  como informação; não é exibida à criança nem recompensada, por isso não é tratada como padrão de
  engajamento proibido pelo Princípio IV.
- **Bloqueio sem liberação**: o Princípio III admite liberação explícita pelo responsável, mas a
  descrição exclui tempo extra e liberação manual; vale a regra mais restritiva da descrição.
- **Períodos sem tela** (SHOULD do Princípio III) ficam fora desta feature.
- **Faixa etária**: não é coletada, pois a aplicação já é destinada a 2–5 anos (minimização).
- **Senha**: não há bloqueio por tentativas erradas; a senha protege contra a criança, não contra
  um adulto, e a recuperação por multiplicação já está disponível.
- **Média diária**: divide sempre por 7, contando dias sem uso como zero.
- **Formato do arquivo exportado** e o mecanismo de funcionamento offline são decididos no plano,
  respeitando a stack da Constituição.
- **Voz do mascote**: falas em voz alta usam recursos do próprio aparelho, sem envio de dados; se
  o aparelho não oferecer voz em português, a fala aparece só no balão.
- **Conteúdo** (frases, ilustrações, sons) é original e embarcado na aplicação, sem recursos
  externos.
