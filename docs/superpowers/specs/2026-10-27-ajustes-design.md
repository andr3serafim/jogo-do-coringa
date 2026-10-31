# Sub-projeto 5: ajustes depois do playtest com os bots

Data: 2026-10-27. Origem: a lista que o autor deixou depois de jogar contra os bots (Fácil, Médio, Difícil). Uma fase por merge na
`main`, na ordem abaixo. O autor delegou as decisões técnicas e de interface à sessão principal ("decida e prossiga"); **as
mudanças nas regras dele (Fases B, D, E e F) ele quer ver**, e nenhuma regra nova é rotulada como aprovada sem a resposta dele.

Marcas: **[feito]** já na `main`; **[decisão]** decidido pela sessão do sub-projeto por delegação; **[autor]** espera o autor.

## Fase A: bugs relatados [feito, `8d7f078`]

- **B1, "buffs contados sem estar na mesa".** Duas causas, medidas em 300 partidas (5195 ataques):
  - bug da web: na espera da batida do dano, a conta "base × N" dividia o total velho pela base nova (o golpe já tirou a carta da
    frente). Em 19% dos ataques (ATK) e 30% (DEF) a mesa mostrava um multiplicador fantasma. A conta agora é do mesmo quadro do total
    (spec da web §3.1);
  - a Pressão da mesa: todo multiplicador acima de 1 + nJ vinha dela (19% dos ataques no fim de partida). Sai na Fase B.
- **B2, "tenho buff, K ou armadilha e não consigo jogar".** Não é bug: 0 divergências entre o que o motor aceita e o que a mesa
  oferece em 21 mil checagens. É regra sem explicação. O motor ganha `noPlayReason` (preso por um teste de propriedade contra o
  `applyAction`); a mesa traduz o código (spec da web §3.4).

## Fase B: remover a Pressão da mesa [feito no código; merge depois do portão do Difícil]

- Pedido do autor (2026-10-23): "remoção completa da implementação". Sai do motor, do simulador, da web, dos testes e das specs 1,
  3 e 4. O anti-travamento padrão fica em **3 rodadas**, como a spec 1 previa sem a Pressão. `RULES_VERSION` 2, `STATE_SCHEMA` 2.
- **A brecha da tartaruga volta** [autor]: o líder que se fecha na Defesa ganha +3,1 pp (Fase B) e +6,1 pp com as regras da Fase D,
  e 16,7% das partidas acabam no anti-travamento. Foram medidas três opções (vitória por vida, empate, morte súbita), em
  `side-session-notes/…/sub5-tartaruga-decisao.md`. **O autor escolheu nenhuma** (2026-10-27): vale "3 rodadas, vence quem tem mais
  vida", com a regra que já existe (sem carta no Ataque não há ataque e a Defesa do oponente não perde carta, spec 1 §1.5 item 3,
  agora com teste próprio), e ele testa a tartaruga no playtest dele depois do jogo pronto.

## Fase C: interface e experiência [decisão]

Tudo dentro da `FlashLock` (spec da web §10.4: no máximo 1 inversão por cena, mantida ≥ 300 ms; nunca mais de 3 trocas claro ↔
escuro numa janela de 1 s; com movimento reduzido, nenhuma inversão) e sem afrouxar nenhum teste de flash. Nenhuma regra na web.

### U1. Tempo de leitura dos textos

- A faixa (o texto de transição: "Sua vez", "Rodada 7 · Ataque", "Duda escolheu atacar primeiro") **fica no ar pelo menos o tempo
  de leitura dela**, `bannerReadMs(texto)` = 600 ms + 30 ms por caractere, entre 1 s e 2 s, contado de quando o texto apareceu.
- A linha do tempo não espera por isso: as batidas, o teto de 1 s quando há decisão esperando (spec §4.1) e a volta dos controles
  seguem iguais. A faixa que sobra é só vista (`pointer-events: none`, já é) e não trava nada: o jogador joga com ela no ar. Uma
  faixa nova troca o texto; o toque na mesa ou o Esc durante as batidas segue pulando tudo, faixa incluída.
- A subida e a descida da faixa seguem pela mesma `FlashLock`: ficar mais tempo no ar só diminui as trocas.
- O balão do motivo da carta (B2) já usa `readingMs` (1,2 s + 55 ms por caractere, de 2,5 s a 8 s).

### U2. O botão de Ressurreição

- O botão "Ressuscitar" ganha arte própria (SVG desenhado no código): uma carta numérica subindo de uma lápide, com três raios, no
  traço de xilogravura do resto da mesa. O detalhe diz de onde vem e o que traz: "1 Ressurreição da quadra · 6 numéricas no
  cemitério".
- O diálogo do cemitério no modo de ressuscitar ganha o mesmo desenho no título.

### U3. Cenas raras

- **Ataque Absoluto e Defesa Absoluta:** 3 s (eram 1,5 s, depois 2,6 s; o autor pediu 3 s em 2026-10-30, feito na E1). O leque
  tem 0,18 s entre uma carta e a seguinte, e o título carimba a 0,9 s, com a última carta chegando. Os quatro J (ou Q) entram em leque atrás do título, um por vez; o
  título carimba (escala de 1,4 para 1, com mola). Raios de xilogravura giram devagar atrás do painel.
- **Exódia:** 4,2 s, em três tempos: os quatro K sobem um a um até formar uma cruz; na chegada do quarto, a única inversão da cena
  (600 ms); o título "EXÓDIA" carimba grande, com "NOME VENCE!" embaixo.
- As três cenas raras **não encolhem com o teto de decisão** (o resto da linha do tempo encolhe): são raras, a Exódia acaba a
  partida, e o toque ou o Esc pulam na hora. No `catchUp` elas continuam virando faixa.
- Com movimento reduzido: o painel aparece e some por esmaecimento, as cartas já paradas no lugar, sem raios girando, sem inversão.

### U4. Movimentos mais suaves

- As cartas deslizam com mola (Motion `type: 'spring'`, `visualDuration` 0,42 s, `bounce` 0,15) em vez de 0,3 s `easeInOut`. O
  início continua na batida que move a carta; a mola só muda o desenho do caminho, não atrasa a jogada.
- Esmaecimentos de 150 ms passam a 220 ms com `ease-out`; o número do dano sobe com desaceleração.
- Com movimento reduzido nada disso muda (duração 0 ou só esmaecimento).

### U5. Fim da partida

- O painel de fim mostra o tempo de partida ("Duração 12:34"). O `Outcome` do protocolo ganha `durationMs` (opcional): o servidor
  calcula de `startedAt` até o fim; o treino, pelo relógio da sala local.
- O título vira "ANDRÉ VENCEU!" ("VOCÊ VENCEU!", "EMPATE!"), grande, em Alfa Slab One (já licenciada, `LICENSES.md`), sobre um
  "estouro" de HQ desenhado no código (estrela de pontas irregulares, papel e ouro com contorno de tinta). O texto acessível segue
  "André venceu".
- Com movimento reduzido, sem o "pop" de entrada.

## Fase D: números do jogo [autor: pedidos dele, medidos antes do merge; feito no código]

- **R2:** 8 Ás (hoje 6). **R3:** fileiras de **8** (hoje 7; correção do autor em 2026-10-27, que antes pedira 10; a garantia de
  compra segue: 4 × 8 = 32 ≤ 64). **R3:** vida padrão 500 (hoje 300), ajustável no menu: config da sala na criação → protocolo →
  servidor (validação) → `createGame` → replay com a config. O treino também tem o ajuste.
- Com 8 cartas cabem **duas quadras na mesma fileira** (4 + 4). A spec 1 §1.8 já prevê que cada quadra conta separadamente: um teste
  confere `quadValues`, o bônus e as Ressurreições com duas quadras numa fileira, e o resumo das regras diz isso.
- Layout: 8 cartas por fileira têm de caber no celular de 360 px, no tablet e no PC (hoje dimensionados para 7), com os números
  legíveis.
- Medidos no simulador antes do merge; recalibra e mede de novo o portão do Difícil. O resumo das regras e o teste que amarra os
  números acompanham.
- Como ficou [decisão]: `deck.aceCopies` (8; sem ele, os Ás têm `faceCopies`, e os replays antigos seguem iguais), `rowLimit` 8 e
  `hp` 500 no `DEFAULT_CONFIG`. A vida escolhível é `HP_CHOICES` = 300, 500, 800 (protocolo): o corpo da criação ganha `hp`
  (o servidor recusa outra com `BAD_HP`), o registro da sala a guarda, a partida e a revanche a usam e o `room` a mostra; no treino,
  a tela do nível tem a mesma escolha, e `?vida=` a marca. As partidas de referência guardam a config inteira e não mudam (a
  `RULES_VERSION` não sobe). No celular de 360 px a carta passa de 34 para 29 px de largura para caberem 8, e o valor e o naipe da
  carta de campo seguem a largura real dela (`cqw`). O baralho novo muda todas as distribuições: a semente do tutorial passou a ser
  `tutorial-2431` (o critério ganhou "ao menos uma numérica no 1º Equipar" e "a iniciativa com o jogador", que a anterior cumpria
  por sorte).

## Fase E: regras novas do autor [autor: respondidas em 2026-10-28, ajustadas em 2026-10-30]

R1 (Healer × Steal), R4 (ver todas as cartas e escolher a ordem) e R5 (manter a carta na mão). As perguntas de 2026-10-27 estão
em `docs/memoria/notas/fase-e-perguntas-2026-10-27.md`; o texto das respostas, em `docs/memoria/decisoes.md` (2026-10-30). Três
merges, nesta ordem: E1 e E2 não dependem de medição; a E3 é medida no simulador antes de virar regra. **[I]** marca o que é
leitura e não está nas palavras dele.

### E1. Sem anti-travamento e sem limite de rodadas

- O autor reprovou o teto de 60 rodadas e a regra das 3 rodadas sem dano ("este jogo não deve ter limite de rodadas"). O
  anti-travamento sai por completo, como saiu a Pressão da mesa: `antiStallRounds` da config, o fim por anti-travamento, o
  `noDamageStreak` (se nada mais o usar), o contador "Sem dano N de 3" da faixa central, o item do resumo das regras, a dica 9
  do tutorial e os textos de fim. Saem também das specs 1, 3 e 4 e dos testes.
- A partida acaba por vida ≤ 0, Exódia, desistência ou W.O. A spec 1 §1.11 perde a "terminação garantida": as invariantes "toda
  partida termina" e "a vida nunca aumenta" (spec 1 §5) são **reescritas, não apagadas**. A primeira vira "toda partida que o
  simulador encerra pelo teto dele é contada e reportada"; a segunda vira "a vida nunca passa da inicial" (com a E3).
- O simulador ganha um teto **só dele** (proposta: 400 rodadas), que conta como "sem fim" nos relatórios e nunca vira regra.
  Reportar a distribuição da duração (mediana, p95, máx.) e a fração que bate no teto, antes e depois da E3.
- Sem o anti-travamento, a tartaruga perde a única forma de vencer parada (`docs/memoria/notas/tartaruga.md`).
- **Defesa Absoluta até o ataque** (autor, 2026-10-30, a resposta à F4; muda a spec 1 §1.5 item 4 e §1.8 "Ao terminar"): ela não
  acaba mais no fim do próximo turno do oponente; dura até ele atacar de fato e acaba depois desse ataque, com 1 Q (o mais
  antigo) ao cemitério, como hoje **[I]**. O Ataque Absoluto e o ataque devolvido por um Reflect contam como ataque **[I]**; a
  Armadilha, o Sacrifício, o Roubo e a Devastação não a encerram, porque ela os bloqueia **[I]**. Entra na E1 para dividir a
  mesma subida de versão e o mesmo portão.
  - **Risco a conferir antes de medir:** sem o anti-travamento, uma Defesa Absoluta que ninguém ataca dura para sempre. Com
    cartas no Ataque o ataque é obrigatório (o turno só termina declarando o ataque), então ela só sobrevive contra quem está de
    Ataque vazio, como a tartaruga. O risco do teto fica nas partidas com a tartaruga, não no greedy nem no Difícil. O relatório
    separa os tetos das partidas com Defesa Absoluta.
  - A interface acompanha: textos que prometem "até o fim do próximo turno", o resumo das regras, as dicas do tutorial e a
    prévia.
- **Absolutos em 3 s** (autor, 2026-10-30, a resposta à nota 7; só web): o Ataque Absoluto e a Defesa Absoluta passam de 2,6 s
  para 3 s; a Exódia fica em 4,2 s **[I]**. O leque e o carimbo acompanham a duração nova, sem tempo morto no fim.
- `RULES_VERSION` 3 e `STATE_SCHEMA` 3. As partidas de referência são regravadas e passam a usar a config atual (500, 8, 8 Ás).
  O portão do Difícil é medido do zero (`pnpm sim:dificil --recomecar`) e a calibração é refeita.

### E2. Equipar livre (muda a regra original da ordem de compra) [feita em 2026-10-30]

- Depois da compra, o jogador vê todas as numéricas recebidas de uma vez e as põe na fileira que quiser, na ordem que quiser
  (a ordem define quem fica na frente da fila). Com as duas fileiras cheias, as opções de hoje continuam (trocar a última de uma
  fileira ou descartar a nova).
- **O que muda no motor:** a ação `EQUIP` deixa de ser "um destino por carta, na ordem de compra" e passa a dizer a ordem.
  Cuidado com o `legalActions` e os bots: com ordem livre, as sequências crescem para k! × destinos. Os bots continuam com a
  lista canônica (ou um Equipar por carta); a web aceita qualquer sequência válida. O tempo esgotado do Equipar segue a regra de
  hoje (cada numérica restante vai para a fileira com menos cartas, empate → Defesa).
- **Interface:** a tela do Equipar mostra todas as numéricas recebidas juntas, e o jogador escolhe carta e destino em qualquer
  ordem (toque ou arraste, como hoje). Isso também atende o pedido de ver as numéricas sem ler o histórico (item 9).
- **Como ficou** (plano `docs/superpowers/plans/2026-10-30-e2-equipar-livre.md`): a ação `EQUIP` ganhou `order` opcional (os ids
  das pendentes na ordem em que entram); sem ela, a ordem de compra, então os bots, o tempo esgotado e os replays guardados não
  mudam, as partidas de referência saem iguais e nem `RULES_VERSION` nem `STATE_SCHEMA` sobem. `legalActions` segue canônica,
  sem `order`. O painel mostra todas as numéricas ("Faltam 3 cartas"); o toque escolhe a carta e o destino vale para ela.
  Leituras **[I]**, a confirmar com o autor:
  - sem tocar numa carta, o destino vale para a primeira que falta, na ordem de compra (o fluxo de antes segue em um toque);
  - no envio antecipado (faltam 1,5 s) e no tempo esgotado, as que faltam entram depois das escolhidas, na ordem de compra;
  - o terminal do simulador (`pnpm play`) continua perguntando na ordem de compra.

### E3. Roubo, cura pela Defesa e limite de especiais (medir antes)

- **Ás = Armadilha ou Roubo**, à escolha na hora; qualquer naipe. O Selvagem no papel de A escolhe um dos dois.
- **Roubo** (só na fase principal do seu turno): pega uma numérica de qualquer fileira do oponente e a põe no fim da fileira que
  o ladrão escolher; com a fileira cheia, a última dela vai ao cemitério. O naipe vira regra (hoje é só visual).
  - ♣/♠: o oponente leva dano igual ao **valor seco** da carta (sem buffs nem bônus de quadra). Um K na Guarda **anula esse
    dano e não quebra**. O dano do roubo **não conta para a iniciativa** e **não mata**: a vida
    do oponente fica em no mínimo 1.
  - ♥/♦: quem roubou cura o valor seco, até a vida inicial.
  - A carta que o ladrão perde com a fileira cheia cura, se cumprir a cura passiva.
  - A Defesa Absoluta do oponente **bloqueia o roubo inteiro**: nada é roubado (autor, 2026-10-30).
- **Cura passiva:** com 2 K ou mais na Guarda **[I: "2 K" = pelo menos 2]**, cada numérica da **própria Fileira de Defesa**
  que vai ao cemitério, de qualquer naipe, cura valor × (1 + nº de Q). A vida nunca passa da inicial.
- **Limite de 4 especiais na mão**, com penalidade na compra (o autor: senão "o player fica juntando K até fazer o exódia").
  Medir 2 ou 3 formas e levar ao autor com a recomendação. Exemplos: a especial que passa do limite vai direto ao cemitério; o
  jogador escolhe qual descartar; ele compra menos cartas no Equipar seguinte. Conferir se Reflect e Devastação (3 cartas cada)
  e o Anular continuam possíveis com 4.
- **Medir no simulador:**
  - taxa de vitória de quem rouba e de quem cura;
  - duração (sem o anti-travamento);
  - a "fazenda de cura": com 2 K, cada ataque recebido tira a 1ª carta da Defesa e cura;
  - se um K que anula o roubo sem quebrar torna o roubo preto inútil;
  - quantas vezes a Exódia aparece com o limite de especiais.
- **Interface:** a mesa mostra a vida subindo (cura) e o dano do roubo; o resumo das regras, o tutorial (dicas do A, do fim e da
  Guarda) e o teste que amarra os números acompanham.

## Fase F: anotações do autor de 2026-10-30 [autor]

Texto dele em `docs/memoria/decisoes.md` (2026-10-30, "Anotações novas"). As perguntas abertas estão no `docs/memoria/estado.md`.

- **F1. Apagar o histórico de partidas** [decisão: só web] **[feita em 2026-10-30]**. Na tela `/partidas`, uma ação de apagar a
  lista guardada (`coringa:partidas`), com confirmação. Apagar uma partida só também cabe.
  - **Como ficou:** cada linha tem "Apagar" (abaixo do "Rever", para caber no celular) e, abaixo da lista, "Apagar o histórico";
    os dois no vermelho do Desistir e com a confirmação dele (`ConfirmDialog`). Detalhes na spec do polimento §4.3. Não muda
    regra: sem `RULES_VERSION` nem `STATE_SCHEMA`.
  - **[I]**, para o autor confirmar: apagar uma partida só também pede confirmação; apagar tudo não mexe no tutorial, nas
    preferências nem no apelido; uma partida online apagada volta à lista se ele reabrir o link daquela sala terminada em até
    24 h (a sala manda o desfecho de novo, e a junção pela `key` não acha mais a linha).
- **F2. Reflect reativo** [autor, aprovado em 2026-10-30]:
  - **Quando:** o Reflect (K+J+Q da mão) deixa de ser lançado na própria vez e de ficar armado. É jogado só na janela de
    reação, quando o oponente declara um ataque ou lança uma Devastação, e vale só para aquele golpe: atacado → lança → o dano
    volta na hora → acabou.
  - **Efeito contra um ataque (o de hoje):** todos os Q e K do atacante quebram; ele leva ATK − ⌊DEF_base / 2⌋; o dono leva 0;
    saem a 1ª carta do Ataque do atacante e a 1ª da Defesa do dono.
  - **Reflect contra Reflect:** quem é refletido pode responder com outro Reflect (K+J+Q da mão; é o Anular de hoje e a única
    resposta a uma resposta). Os dois se anulam, as 6 cartas vão ao cemitério e o atacante passa o turno, sem golpe
    **[I: nenhuma carta sai das fileiras e ninguém leva dano]**.
  - **A Proteção por sacrifício sai do jogo.**
  - **Defesa Absoluta:** o Reflect lançado contra um atacante sob Defesa Absoluta é anulado **[I, a confirmar: segura o golpe
    (o dono leva 0), mas não devolve dano nem quebra Q e K]**.
- **F3. Devastação** [autor, aprovada em 2026-10-30]:
  - **Jogada:** K + A + J (ou K + A + Q) sai da mão na fase principal da sua vez e esvazia a Fileira de Ataque (ou de Defesa)
    **do oponente**. Todas as numéricas dela vão ao cemitério, os buffs ficam e a quadra se desfaz. As 3 cartas vão ao
    cemitério.
  - **Resposta:** abre a janela de reação do oponente, e a única resposta é o Reflect. Ele devolve a Devastação (quem lançou
    perde a própria fileira do mesmo tipo), sem quebrar Q nem K de quem lançou. A Armadilha não responde.
  - **Restrições:** não pode ser lançada contra quem está sob Defesa Absoluta. O Selvagem faz o papel do A, do J ou do Q, nunca
    do K. As cartas destruídas pela Devastação não curam.
  - **Cena:** cinematográfica, à altura, dentro da `FlashLock` e do movimento reduzido (spec da web §10.4).
- **F4. Ataque vazio** [bug relatado pelo autor em 2026-10-30; investigado, sem bug no motor nem na mesa]. O motor recusa o
  ataque com o Ataque vazio, e nenhuma Defesa perdeu carta sem ataque em 2.000 partidas simuladas nem numa partida de treino
  jogada de tartaruga. Explicações levadas ao autor: a Defesa Absoluta, que acaba e gasta 1 Q no fim do próximo turno do
  oponente mesmo sem ataque; ou o atacante de uma carta só, que fica com o Ataque vazio depois do golpe. Detalhes em
  `docs/memoria/notas/revisao-das-notas.md`. **O autor confirmou a primeira e mudou a regra** (2026-10-30): a Defesa Absoluta
  dura até o oponente atacar de fato (na E1).
- **F5. Tabuleiro quebrado** [corrigido]. No PC de 1536 × 695 (mesa compacta), as zonas dos especiais se espremiam
  (`min-height: 0`) e a lista das marcas ocupava a coluna inteira (`flex-basis: 100%`, pensado para o celular). Agora nenhuma
  zona encolhe abaixo das cartas e as marcas têm a altura delas; o campo cresce junto. Coberto por `e2e/layout.spec.ts`
  (1536 × 695, 1366 × 657 e 1440 × 900). Com o Reflect reativo (F2), a zona "Reflect ativo" deixa de existir e a coluna
  encolhe de novo.
- **F6, F7 e F8** (ver todas as cartas; Absolutos e Exódia mais longos; movimentos suaves): a F6 é a E2; a F7 e a F8 entraram
  na Fase C (`bba8377`). O autor jogou depois de 27/10 e achou que nem tudo das notas foi feito: **revisar uma a uma, no jogo,
  todas as notas de 23/10 e de 30/10** (registro em `docs/memoria/notas/revisao-das-notas.md`).
- **Ordem proposta:** E1 → E2 → F1 e F5 (só web) → E3 com F2 e F3 medidos juntos, porque o Reflect reativo, a Devastação, o
  roubo, a cura e o limite de especiais mexem no mesmo equilíbrio.
