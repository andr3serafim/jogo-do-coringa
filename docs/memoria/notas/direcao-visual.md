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
