# A cura que se vê, as placas só com a figura e o histórico legível

Data: 2026-11-23. Origem: `docs/memoria/decisoes.md` 2026-11-23 (7), (8) e (9). Protótipo e fotos:
`docs/superpowers/specs/2026-11-23-cura-direcoes/` (`LEIAME.md`). Branch `feat/cura-historico-visitantes`.

**Estado: rascunho, à espera do "sim" do autor.** Os pontos marcados **[minha]** são escolhas minhas que ele não viu; os marcados
**[pergunta]** esperam a resposta dele.

## 1. Por quê

O autor joga e é curado sem saber por quê. Hoje a cura existe na tela (o "+N" verde sob o retrato, o trecho verde da barra, os K que
acendem, a linha do histórico, a faixa da primeira cura), mas:

- **ela quase não aparece:** com uma jogada sua esperando (o caso comum: o Bot ataca, a sua Defesa cai e cura, e é a sua vez), a linha do
  tempo inteira do passo cabe em 1 s (`DECISION_CAP_MS`), e a batida da cura (600 ms) encolhe junto;
- **nada liga a causa ao efeito:** a carta cai no cemitério, e o número aparece longe, sob o retrato, sem caminho entre os dois.

As placas de estado (Cura passiva, Ressurreição, Defesa Absoluta, Ataque Absoluto) são um medalhão com nome e uma linha de texto; ele quer
a figura no lugar do texto. E a lista de partidas some no tema verde do menu (texto de papel sobre papel), e deve deixar evidente quem
ganhou e quem perdeu.

**Sucesso:** na hora da cura, o jogador vê a carta que caiu virar vida, ver a vida subir e ler a conta (+28 · 7♥ × 4), em qualquer tela,
dos dois lados da mesa; as marcas do Coringa são figuras que se explicam ao toque; a lista de partidas é legível nos dois temas e diz o
resultado pela cor.

## 2. Metas, não metas e anti-metas

**Metas**
1. A animação da cura da direção A (Seiva), para a cura passiva (Defesa) e a do Roubo, dos dois lados.
2. O carimbo "+N" junto da barra de vida, com o **bruto** e a conta; a vida sobe só o **líquido**.
3. A cura sai do teto de decisão e ganha folga no relógio, como as cenas.
4. As placas de estado e o Reflect só com a figura; o nome e o que faz ao passar o mouse, focar ou tocar.
5. A lista de partidas legível no verde, com vitória em verde e derrota em vermelho; o mesmo conserto nas outras telas do menu.

**Não metas**
- Visitantes: o autor vê pelo painel da Cloudflare (decisoes (8)). A CSP fica como está.
- Regra do jogo: nada muda no motor. Sem `RULES_VERSION` nem `STATE_SCHEMA` novos; as partidas de referência não mudam.
- Os títulos das zonas (Guarda, Bônus de ataque, Bônus de defesa) seguem com a figura e o texto de hoje: são nomes de lugar, não estados.
- Som novo para a cura **[minha]**: o sintetizador não tem pista de cura, e ninguém pediu. Fica para depois, se ele quiser.

**Anti-metas** (o que faria falhar mesmo funcionando)
- Flash de tela, filtro ou sombra com desfoque (a Devastação com arte no celular já está no limite; spec da web §10.4).
- Segurar a jogada por mais que o combinado: a cura bloqueia ~1,4 s; o carimbo some sozinho depois, sem segurar nada.
- Uma placa que só o mouse explica: o toque e o teclado também abrem, e o leitor de tela lê sem abrir.
- Regressão no que está no ar: o `estado.md`, "O que não pode regredir".

## 3. Abordagens consideradas

As três do protótipo, sobre a mesma cura (o 7♥ cai da sua Defesa com 2 K e 3 Q: +28):

| | O que faz | A favor | Contra |
|---|---|---|---|
| **A · Seiva** (escolhida) | a carta no cemitério solta uma gota que sobe até a ponta da barra; faíscas, brilho, o número conta, o carimbo +28 · 7♥ × 4 | mostra a causa e a conta; a mais curta (~1,4 s); o Roubo e a vida cheia não pedem caso à parte | a conta é lida, não vista |
| B · Gotas | uma gota +7 da carta e uma de cada Q; a barra enche em degraus | a que mais explica o número | até 5 gotas; ~1,9 s com 3 Q; a vida cheia e o Roubo (as gotas viriam das cartas do oponente) pedem exceções |
| C · Coração | a carta vira o coração da cura, voa ao retrato, anéis, o +28 sai dele | a mais "de jogo" | a que menos mostra a conta |

O autor escolheu a **A** (decisoes (9), 1).

Para o histórico, duas opções com fotos (`prancha-historico.png`): **1 · Faixa** (a faixa colorida à esquerda e um degradê leve, a
palavra do resultado na cor, como o histórico do CS2) e **2 · Selo** (o resultado num selo colorido e a borda e a sombra da linha na cor).
**[pergunta]** Qual. A minha recomendação é a **1**: é o "tipo CS2" que ele citou, e no tema verde a borda verde da 2 some no fundo verde.

## 4. A cura (direção A)

### 4.1 Quando toca

Em todo `Healed`, de **qualquer lado** (a sua cura e a do oponente; decisoes (9), 3), ao vivo e no replay. O motor já emite o evento e a
web já tem a batida dele (`timeline.ts`, `Healed`).

- **O bruto e o líquido** (decisoes (9), 2): o carimbo mostra o **bruto**; a barra e o número sobem o **líquido** (`Healed.amount`, que o
  motor já corta na vida inicial).
  - Cura passiva: bruto = `defenseHealOf(card, lado)` (o que o `healRibbon` já usa). Conta: `7♥ × 4` (o valor e o naipe da carta, × (1 + Q)).
    **Por que o lado do fim do passo serve:** num passo (uma ação), nada tira nem põe Q de quem cura depois do `healFromDefense`. Conferido
    no motor: as Q só entram pela jogada da Q (`actions/main.ts`, uma ação à parte); saem pela Armadilha e pelo Sacrifício (ações à parte),
    pelo Reflect (as do **atacante**, antes da Defesa cair, em `resolveAttack`) e pelo fim da Defesa Absoluta (`expireEffects`, em
    `flow.ts`), que só vale para quem está sob ela, e sob ela a Defesa não cai nem cura. O Equipar (`equip.ts`) e a Ressurreição só mexem
    em numéricas. Um teste do motor trava isso (o bruto de cada `Healed` de um passo é igual ao `defenseHealOf` com o lado do fim do
    passo), para uma regra nova não quebrar o carimbo em silêncio. Nada muda no evento (nem nas partidas de referência).
  - Roubo: bruto = o `value` do `StealDamage` do mesmo passo (o valor com o bônus da fileira de onde a carta saiu, `stealAmount`). Conta:
    `7♥ × 2` (× (1 + J) ou × (1 + Q) **do oponente**).
  - Com o multiplicador 1, a conta é só a carta (`7♥`) **[minha]**.
- **A vida já cheia** (o líquido é 0): **[pergunta]** pela regra dele (o bruto no carimbo, a vida sobe o líquido), a cura toca inteira e a
  barra não se mexe. Hoje ela passa quieta (sem número). Proposta: tocar, para o jogador ver que a cura existiu e que a vida estava cheia.
- **Reconexão** (`catchUp`, a linha do tempo dos eventos perdidos): a cura fica curta, como hoje (o "+N" do **líquido** e a barra,
  dentro do teto da reconexão, sem carimbo nem conta) **[minha]**: quem volta precisa alcançar a mesa, e ali a vista é a do fim de vários
  passos, que não garante o bruto.

### 4.2 O que se vê (na ordem; os tempos são do protótipo, a 1×)

A carta sai da Defesa e cai no cemitério como hoje (a batida de movimento, que não muda). Depois, a batida da cura (~1.400 ms):

1. **0 ms:** a carta de cima do cemitério acende (um contorno verde que cresce e some, 420 ms). Na cura passiva, os K da Guarda de quem
   cura acendem (o realce `cause` de hoje, mais forte; dura a batida). No Roubo, a origem é a carta roubada, já na fileira de quem roubou.
2. **120 ms:** sai da origem uma gota (o coração da cura num disco, 30 px no PC, 22 px no celular) que sobe num arco até a ponta da barra
   de vida de quem cura, em 640 ms, com um rastro curto de cruzes pequenas que encolhem e somem.
3. **760 ms, a chegada:** faíscas (cruzes verdes que saem do ponto e somem, 520 ms); o trecho verde da barra vai até a vida nova e um brilho
   corre por ele (620 ms); o ouro e o número contam até a vida nova (520 ms) e o número pulsa; o **carimbo** bate logo abaixo da barra,
   centrado na ponta da vida nova (sem cobrir o centro do placar), inclinado, com o bruto em cima ("+28") e a conta embaixo ("7♥ × 4").
4. **~1.400 ms:** a batida acaba e o jogo segue. O carimbo fica mais ~1,2 s por conta própria e sai subindo e esmaecendo, mesmo que a
   batida seguinte já tenha começado.

**A vida do carimbo depois da batida** (peça nova: hoje o número vive só dentro da batida):
- uma nova cura ou o número de um golpe do **mesmo lado** o substitui na hora;
- uma cena rara (as que têm cortina) o corta na hora: a última cena só fica com a cortina da cena (o "não pode regredir" do `estado.md`);
- o fim da partida (`GAME_OVER`) e o golpe final o cortam;
- ao sair, ele deixa a página (como a poeira do `Leaving`), sem nó sobrando.

**Lado do oponente:** o mesmo, espelhado: a barra dele cresce da direita, o carimbo fica sob a barra dele, sem cobrir o centro.

**Movimento reduzido:** nada voa nem pisca; o carimbo e o verde da barra só aparecem (esmaecer de 200 ms), os K ficam acesos parados, e a
vida vai direto ao valor novo.

**O carimbo:** a fonte de texto com `tabular-nums` (números de jogo sem textura, spec da web §10.7), papel sobre o verde da cura
(`--color-cura`), contorno de tinta e sombra dura (sem desfoque). No PC ~40 px; no celular ~22 px. Substitui o "+N" pequeno sob o retrato
na cura (o do golpe fica como está).

**A faixa da primeira cura** (`healRibbon`, a explicação da regra na primeira cura passiva da partida) fica **[minha]**: ela explica a
regra em palavras uma vez, e a animação mostra a conta toda vez.

### 4.3 O tempo e o relógio

- A batida da cura vira **sem teto** (como as cenas e o momento): não encolhe para caber em `DECISION_CAP_MS`. Duração base: 1.400 ms.
- **A folga do relógio:** `packages/protocol/src/scenes.ts` ganha `HEAL_MS = 1_400`, somado em `stepAllowanceMs` a cada `Healed` **que
  toca** (dentro do teto `SCENE_ALLOWANCE_CAP_MS`): todos, se a resposta à pergunta da vida cheia (4.1) for "tocar"; só os com
  `amount > 0`, se for "não tocar". A regra da folga e a da web saem da mesma função do protocolo, para nunca divergirem. O servidor
  (`schedulePhase`, em `timing.ts`, que estende o prazo em qualquer fase, também no Equipar e na janela de reação), a web e o Bot do treino
  (`local-room.ts`) leem a mesma tabela. Assim a animação nunca come o tempo de quem vai jogar.
- Custo aceito pelo autor (decisoes (9), 4): ~1,4 s por cura, quase uma por ataque com a cura passiva ligada.
- **O deploy:** a folga só vale online depois do deploy (o servidor e a web sobem juntos no Worker). Nada de estado muda.

### 4.4 Onde mexe (para o plano)

- `protocol/src/scenes.ts`: `HEAL_MS` e a soma em `stepAllowanceMs` (e os testes dela).
- `web/src/model/timeline.ts`: o `Healed` vira batida própria da cura (sem teto, `HEAL_MS`), também com o líquido 0 se a resposta à
  pergunta de 4.1 for "tocar"; no `catchUp`, curta.
- `web/src/model/effects.ts`: o efeito da cura leva a origem (cemitério ou a carta roubada), o bruto, a conta e o líquido.
- A camada da gota e das faíscas no `Stage` (as âncoras de hoje: `data-cemiterio`, `data-card-id`, a barra do placar); o carimbo e o
  brilho no `FightHud` (`HpBar`, o `DamageNumber` de hoje para a cura).
- As regras de animação de sempre: só `transform` e `opacity`; nada de `filter` nem sombra com desfoque; com movimento reduzido, nada voa.

## 5. As placas só com a figura (decisoes (8) e (9), 5)

- **As quatro placas** (`StatePlate`: Cura passiva, Ressurreição, Defesa Absoluta, Ataque Absoluto armado) viram **só o medalhão**: 44 px no
  PC, 36 px no celular, com a figura e os gestos de hoje (a cruz da cura que bate, a alma da Ressurreição, o selo com o número de
  Ressurreições). O nome e a linha (`plateLine`, com os casos de borda de hoje) saem da vista.
- **O Reflect:** o título "Reflect ativo" e a linha da zona dele dão lugar ao medalhão do Reflect (o `ReflectIcon`), com a mesma dica; as
  três cartas e o espelho (`MirrorMark`) ficam.
- **A dica:** um cartão de papel com contorno de tinta e sombra dura, com o nome e a linha, que abre ao passar o mouse, ao focar pelo
  teclado ou ao tocar; tocar de novo, tocar fora ou o Esc fecham. Uma dica aberta por vez.
  - **Onde ela desenha:** em telas baixas os campos rolam por dentro, e uma dica presa ao campo seria cortada. Ela desenha numa camada da
    mesa, por cima dos campos, posicionada pelo medalhão, e não sai da tela (vira para cima ou para o lado perto da borda).
  - **O Esc:** o `Stage` e a `PlayTable` já ignoram o Esc com `defaultPrevented`; o da dica fecha e marca o evento, para não pular a cena
    nem abrir o menu.
- **Acessibilidade:** cada medalhão é um botão com o nome acessível "nome: linha" (o leitor de tela lê sem abrir a dica). São paradas de Tab
  novas na mesa **[minha]**: o teclado precisa chegar à dica.
- **O toque durante as batidas:** o `Stage` termina as batidas com um toque na mesa e engole o clique. A lista das placas e o medalhão do
  Reflect ganham `data-sem-pulo` (o toque ali é só da dica). **Isto muda uma regra do `CLAUDE.md`**, que hoje só deixa os controles do
  replay e o painel da dica do tutorial usarem `data-sem-pulo`; a regra ganha "e as figuras das marcas do Coringa".
- **Testes:** os que procuram "Cura passiva" e "Reflect ativo" pelo texto visível (`table.test.tsx`) são reescritos para o nome acessível
  e a dica, nunca apagados.
- **O coração da cura no disco verde** ganha contraste (o coração em papel com contorno de tinta, ou o disco claro) **[minha]**: no
  protótipo ele quase some.

## 6. O histórico de partidas (decisoes (9), 6)

- **O conserto:** a linha de `/partidas` (`PastGames.tsx`, `Row`) ganha a cor de texto da tinta; no Lobby, as linhas 143 (o aviso), 157 (o
  assento) e 172 (o selo "pronto", em ouro) também. Antes do plano, uma varredura de **todas** as telas dentro do `MenuScreen` no tema
  verde, comparando a cor do texto com a do fundo (o grep só acha os `bg-papel`).
- **O resultado pela cor** (a opção que ele escolher em §3): vitória em verde (`--color-cura`), derrota em vermelho (`--color-vermelho`),
  com contraste ≥ 4,5:1 da palavra **sobre o fundo dela** (na opção 1, o degradê, que é mais escuro que o papel; medido, e o tom do
  degradê desce se não passar); o empate e a partida sem resultado ficam neutros (o papel de hoje) **[minha]**. O resultado
  continua escrito ("Vitória", "Derrota"): a cor reforça, não substitui.
- **O teste que reprova o verde:** um E2E no tema verde que abre `/partidas` com partidas guardadas e mede o contraste do texto de cada
  linha contra o fundo dela; o mesmo para o Lobby, no E2E online que já passa por ele.

## 7. Riscos

- **A linha do tempo:** a cura sem teto muda a duração de passos com `Healed` (os testes de `timeline.test.ts`, `animation.test.tsx` e as
  medições). A folga no relógio cobre o online e o treino.
- **Desempenho no celular:** a gota, o rastro e as faíscas são poucos elementos e só `transform`/`opacity`; medir com o `medir-cena.ts` na
  Devastação e na cura antes de fechar.
- **O replay:** as partidas guardadas tocam a cura nova (não muda o resultado, só o desenho).
- **O orçamento:** o código novo fica na mesa (o pacote inicial não muda muito); o smoke confere os 200 KB.
- **As paradas de Tab novas:** os E2E e os testes de acessibilidade (axe) que andam pela mesa com o teclado podem mudar de ordem; conferir
  e ajustar, nunca afrouxar.
- **Os tempos mais longos:** o Bot do treino e os E2E online esperam mais nos passos com cura; os prazos de espera dos E2E e do
  `local-room.ts` podem precisar de folga.
- **O carimbo do oponente no celular:** fica sob a barra dele, perto do botão do menu da partida no alto do campo dele; foto na
  implementação para garantir que não cobre o botão.

## 8. O que fica para o construtor

Os nomes de arquivo e de componente, a forma da camada da gota no `Stage`, os tempos finos (dentro dos ~1,4 s), as cores exatas do brilho e
das faíscas (dentro da paleta), o desenho do cartão da dica (dentro do Folheto da mesa) e a ordem das tarefas no plano.
