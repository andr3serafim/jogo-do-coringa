# Sub-projeto 6: direção de arte e sensação de jogo (brainstorming)

Começou em 2026-10-31, a pedido do autor, depois do merge da marca "Cura passiva". O que ele disse vai entre aspas; o resto é
leitura de quem conduz, marcada **[I]**. Quando virar spec, ela mora em `docs/superpowers/specs/` e esta nota fica como origem.

## O pedido

> o que falta para finalizar? o polimento foi feito? animações estão cinemáticas? movimentos estão suaves? o jogo merece um
> polimento visual a nível de jogo Balatro? uma ideia que tive é o jogo ter barras de HP to topo simulando jogos de arcade de
> luta. O visual completo mais intuitivo a nível triple AAA, como um jogo indie indicado ao melhor jogo do ano.

Ao "começo o brainstorming da nova direção visual?": "Sim, começar".

## As respostas, na ordem

1. **O lance em que faltou peso:**
   > Em momentos em que usei jogadas especiais e que virou o jogo não foi transmitido emoção e empolgação. O jogo tbm não está
   > fluído e com movimentos suaves e com efeitos visuais marcantes. Em momentos de posse de inciativa eu não via.
2. **Quais especiais:**
   > ataque absoluto, exódia, devastação, defesa absoluta, reflect, até ressureição eu senti falta
3. **O que já o arrepiou:**
   > o que me arrepiava era quando ocorria a cinemática de super e mega digievolução do anime digimon em momentos chave causando
   > o climax da batalha. dragon ball z tbm me arrepiava quando ocorria as transformações super sayajin e ataques super poderoros.

## Leituras até aqui

- **[I]** Três dores: as seis especiais sem clímax; o movimento sem fluidez e sem efeito marcante; a iniciativa invisível
  (mesmo depois do placar e da faixa de 2026-10-31, então o problema é de onde o olho está, não só de texto).
- **[I]** O que as referências têm em comum é a gramática, não o desenho: preparação (a energia junta), transformação (o
  personagem muda de forma), o nome gritado, o impacto e o momento-chave (o clímax vem da virada). A arte segue original
  (`CLAUDE.md`, "Arte original"): nada de Digimon nem de Dragon Ball na tela, só a mesma estrutura de cena.
- **[I]** A identidade de cordel (xilogravura, papel, tinta, a segunda cor) fica; o placar de jogo de luta no topo entra como
  estrutura, num híbrido com a Peleja. O rascunho "Fliperama" que ele descartou na spec da web §10.1 tinha esse placar.
- Os limites que seguem valendo: fotossensibilidade (spec da web §10.4), legibilidade (§10.7), o orçamento de 200 KB de JS
  inicial e o caminho por toque e teclado.

## Rascunhos mostrados

- `.superpowers/brainstorm/` (fora do git): servidor de rascunhos do brainstorming. O que ele escolher vai registrado aqui.
- **Rascunho 1** (`placar-e-cenas.html`): o placar de luta no topo (barras espelhadas com o rastro vermelho), o selo redondo
  "1º · VEZ" no retrato de quem tem a iniciativa, o Ataque Absoluto como golpe (corte com raios coloridos, J em órbita, raio e
  impacto), a Defesa Absoluta como transformação (aura de chamas, coroa, onda de choque), o golpe comum e as cartas que
  inclinam. A reação dele:
  > Achei semelhante os absolutos. O ataque absoluto ficou bom mas pode melhor, com as chamas atrás algo que remete a poder
  > supremo. achei exagerado essas listras coloridas de fundo. já a defesa não deve ter as chamas, deve ter um símbolo de escudo
  > que remete a fortaleza. observação: remover os textos pequenos das cenas especiais ("quatro J atravessam a guarda para
  > ataque" e "nenhum dano até o próximo ataque").
  > Golpe comum está bom e iniciativa está muito amador. remova o circulo que fica no avatar e no lugar de 1ª vez coloque a
  > imagem de uma espada indicando ataque tudo isso com visual mais intuitivo e nível jogo indie vencedor de prêmio.
  - **Aprovado por ele:** o golpe comum (peso, rastro vermelho, número).
  - **A mudar:** cada especial com identidade própria (o Ataque com chamas de poder supremo; a Defesa com escudo de
    fortaleza, sem chamas); fundo sem as listras coloridas; as cenas sem legenda; a iniciativa sem o círculo, com uma espada.
- **Rascunho 2** (`placar-e-cenas-v2.html`): o Ataque com fogo em três camadas que "ferve" (desenho trocado a cada 110 ms),
  brasas, os J absorvidos e os olhos acesos; a Defesa com a muralha que sobe, o escudo de ameias entalhado, os 4 Q cravando
  nos quartos e a insígnia no retrato; a espada da iniciativa que gira e crava, com a fita de cordel; textura de papel na mesa.
  A reação dele (aceitou a espada e a estrutura, pediu ajustes):
  > ok, ajustes que quero que faça: ajuste para que o feixe de luz do ataque absoluto seja mais grosso, dando a impressão de
  > mais poder e o fogo atrás do coringa seja algo como o Ki do Goku quando se transforma de super sayadin. E quando a defesa
  > absoluta, deixe o escuto mais épico e poderoso.
  - **[I]** "Ki" = aura de energia colada ao corpo, com pontas para cima, que pulsa e cresce na transformação (raios, vento
    de energia, pedras que flutuam). A referência entra pela estrutura; o desenho continua do jogo, em ouro, papel e tinta.
- **Rascunho 3** (`placar-e-cenas-v3.html`): o Ataque com a aura de energia (três camadas que trocam de forma a cada 70 ms e
  pulsam, pedras que flutuam, vento de energia, a explosão na entrada dos J com o chão rachado em ouro e raios) e o feixe
  com o dobro da espessura, que sai de uma bola de energia e segura o golpe por quase 1 s; a Defesa com o escudo maior que
  despenca e crava (o chão racha), aro de metal gravado com 22 rebites que acendem em sequência, o emblema da coroa, a cúpula
  de luz e os raios suaves atrás. A reação dele:
  > ok, aprovado. apenas retire o arco dourado no fim da animação da defesa absoluta. não precise me mostrar o rascunho.
  > prossiga.
  - **Aprovados:** o Ataque Absoluto e a Defesa Absoluta do rascunho 3, **sem a cúpula** (o arco dourado do fim da Defesa);
    o placar de luta no topo, a espada da iniciativa com a fita de cordel e o golpe comum (aprovados desde o 2).
  - **Próximo:** levar a mesma linha às outras quatro especiais que ele citou (Exódia, Devastação, Reflect, Ressurreição).
