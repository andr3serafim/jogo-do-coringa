# Sub-projeto 5: ajustes depois do playtest com os bots

Data: 2026-10-27. Origem: a lista que o autor deixou depois de jogar contra os bots (Fácil, Médio, Difícil). Uma fase por merge na
`main`, na ordem abaixo. O autor delegou as decisões técnicas e de interface à sessão principal ("decida e prossiga"); **as
mudanças nas regras dele (Fases B, D e E) ele quer ver**, e nenhuma regra nova é rotulada como aprovada sem a resposta dele.

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

- **Ataque Absoluto e Defesa Absoluta:** 2,6 s (eram 1,5 s). Os quatro J (ou Q) entram em leque atrás do título, um por vez; o
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

## Fase E: regras novas do autor [autor]

R1 (Healer × Steal), R4 (ver todas as cartas e escolher a ordem) e R5 (manter a carta na mão). Brainstorming → perguntas de regra em
lote ao autor → spec → plano, numa seção própria deste arquivo quando as respostas chegarem.
