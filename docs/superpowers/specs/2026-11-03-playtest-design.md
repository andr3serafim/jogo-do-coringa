# Os pontos do playtest: desenho

> **RASCUNHO, NÃO APROVADO.** Escrito em 2026-11-03 com o autor fora (`decisoes.md` 2026-11-03 (3)), para ele reagir. As recomendações
> são minhas; as perguntas da §9 são dele. Nada daqui vira código antes da aprovação dele.

- **Origem:** os pontos 1, 2, 5, 6, 9, 10, 11, 13 e 14 (`decisoes.md` 2026-11-02 (9)), o 15 (2026-11-02 (10)) e o 16 (2026-11-03 (1)).
  Os diretos (3, 4, 7, 8, 12 e 18) já estão na `main`; o 17 foi fechado (era a Armadilha, 2026-11-03 (2)).
- **Protótipo:** `docs/superpowers/specs/2026-11-03-playtest-prototipo.html`. Abre direto no navegador, com dois cliques no arquivo
  (conferido: as fontes vêm de `packages/web/node_modules` por caminho relativo, sem erro no console), ou num servidor estático com a raiz
  no repositório. Cada ponto tem o seu quadro, os botões para tocar e as variantes.
- **Números do ponto 16:** `docs/memoria/notas/medicao-ponto-16.md` (2.000 partidas greedy × greedy).

## 1. A intenção

O autor jogou a fatia 5 e disse três coisas por trás dos pontos:

- **"Fico perdido"** (pontos 1, 2, 6 e 9): a mesa não conta o que aconteceu. As especiais do oponente só se mexem, as marcas são etiquetas
  planas, a cura aparece sem causa, e a mão não diz o que joga agora. O jogador acaba lendo o histórico.
- **"Mais empolgante"** (10, 11, 13 e 15): o poder acumulado não se vê. Dois J e quatro J parecem iguais até o Ataque Absoluto; quem
  segura a iniciativa por dez rodadas parece igual a quem a pegou agora; a partida termina sem clímax quando o golpe é comum.
- **"Identidade"** (5 e 14): os botões e o centro da mesa ainda são de interface genérica, fora da Peleja.

E uma regra (16): a Ressurreição deve valer no instante em que a quadra se forma, e a fileira cheia não deve travá-la.

**O que seria fracasso mesmo funcionando:** a mesa virar um carnaval (tudo brilhando o tempo todo, nada se destaca); as jogadas ficarem
lentas (cada especial uma cena longa); a tela piscar; o celular de 360 px não caber; o ritmo de 50 quadros/s com a CPU 4× cair.

## 2. A ordem proposta

São cinco blocos independentes. Proposta de ordem, a mais valiosa primeiro:

| Bloco | Pontos | Por quê nesta posição |
|---|---|---|
| A. A mesa que se explica | 1, 2, 6, 9 | É a queixa mais forte ("fico perdido") e muda como se joga, não só como se vê |
| B. O golpe final | 15 | Curto, isolado, e fecha a partida com o clímax que falta |
| C. O poder que cresce | 10, 11, 13 | Depende de A nas marcas (o 6) e mexe no motor (o 11) |
| D. Identidade | 5, 14 | Puro visual; o 14 mexe no arranjo da mesa, que pede fotos em todas as telas |
| E. A Ressurreição no instante da quadra | 16 | Regra: motor, bots, calibração e portão do Difícil. Pode correr em paralelo, numa sessão própria, assim que as regras da §9 forem respondidas |

Cada bloco vira uma fatia com plano, teste primeiro, fotos e medição, como as fatias do sub-projeto 6.

## 3. Bloco A: a mesa que se explica

### 3.1 A jogada especial do oponente (ponto 1)

- **O que muda:** toda especial jogada pelo **oponente** (K na Guarda, J e Q nos Bônus, Armadilha, Roubo, Sacrifício, o Selvagem em
  qualquer papel, também na janela de reação) vira um momento: a carta sai da mão dele de costas, vira grande no centro da mesa com um véu
  escuro leve (35%), e uma placa diz o nome e a **consequência** em uma linha, com os números do motor ("Bot pôs 1 K na Guarda · com 2 K, a
  Defesa dele que cai o cura"; "Bot quebra 1 J seu · o seu Ataque cai para ×2"). Depois a carta voa ao destino ou acerta o alvo (o alvo
  racha e estoura, como na fatia 5). O Reflect, a Devastação e a Ressurreição já têm cena e ficam como estão.
- **Duração:** ~1,6 s por especial (0,3 s a virada, ~1 s a placa, 0,3 s o voo). As suas jogadas não ganham o momento: você sabe o que jogou.
  Online, o seu oponente vê as suas assim (os dois lados, como o autor pediu).
- **O ritmo, medido** (1.000 partidas greedy × greedy, 14.508 turnos do Bot): o Bot joga em média 1,12 especial por turno; 42% dos turnos têm
  uma, 25% têm duas, 5,8% têm três e 0,8% têm quatro. Na janela de reação ao seu turno, 6,8% dos seus turnos recebem uma. **Compressão:** a
  primeira especial do turno dele tem o momento inteiro; a segunda em diante, no mesmo turno, tem a placa por ~0,6 s (o momento fica em
  ~1,1 s). Com o pensar do bot (600 ms) entre elas, o turno de duas especiais leva ~3,9 s, e o de três ~5,6 s. Um toque pula, como nas cenas.
- **Variantes no protótipo:** A, no centro (recomendada); B, na beira do campo dele.
- **Onde mexe:** `model/timeline.ts` ganha uma batida nova para essas jogadas (hoje são `move`), que não encolhe no teto de 1 s: ela é a
  informação que o jogador precisa para decidir a reação. O texto da placa sai de uma função de cópia nova (`model/copy.ts`), com os
  totais do motor. A carta grande é uma cópia, como as cartas que saem (`Leaving.tsx`).
- **Online:** a folga de cena do servidor (`sceneAllowanceMs`, `packages/protocol/src/scenes.ts`) passa a somar o momento, para o prazo
  da sua decisão não correr durante ele. O bot do treino espera do mesmo jeito. Isso muda o servidor (o deploy é do autor).
- **Movimento reduzido:** a carta aparece e some no centro, com a placa, sem voo nem véu.
- **Leitor de tela:** a placa vai para a região viva da mesa, como as faixas.

### 3.2 As cartas da mão que agora não jogam (ponto 2)

- **O que muda:** a carta sem jogada **agora** fica apagada (dessaturada e mais escura), desce 8 px, para de respirar e ganha um cadeado
  pequeno no canto. A que joga fica em pé, respirando, com um fio de ouro embaixo. O toque na apagada segue mostrando o motivo (o balão de
  hoje, do `noPlayReason` do motor).
- **Variantes:** A, apagada com cadeado (recomendada); B, carimbo "AGORA NÃO".
- **Onde mexe:** `Hand.tsx` e `TableCard.tsx`. A informação já existe (as zonas da jogada e o `locked` da mesa); nenhuma regra na interface.
- **"Joga agora"** inclui as jogadas em combinação (o Reflect, a Devastação, o Sacrifício): quem decide é a lista legal do motor
  (`legalActions`), e uma carta só apaga se nenhuma jogada legal a usa. O J com 4 J nos Bônus, por exemplo, segue aceso se o Sacrifício
  contra um J do oponente for legal.
- **Cuidado:** durante as batidas a mão inteira está travada; as cartas não devem apagar e acender a cada batida. Elas seguem o estado da
  decisão (com a mesa parada), não o `locked` momentâneo.

### 3.3 As marcas de estado (ponto 6)

- **O que muda:** as etiquetas viram **placas com medalhão**: um desenho maior, o nome e uma linha do que a marca faz ("a sua Defesa que cai
  vira vida", "o próximo golpe volta para ele", "traz 1 numérica do cemitério", "imune até o golpe dele"). Cada uma com a sua cor e um gesto
  lento (a cada ~3 s): a cruz da cura bate e solta um "+", o espelho tem um brilho que passa, a carta-alma sobe do túmulo, e o número de
  Ressurreições vira um selo.
- **Celular:** a linha do que a marca faz some abaixo de 600 px de largura (fica o nome), para caber no campo.
- **Regra que muda:** hoje só a respiração da mão e o brilho da quadra se repetem sem fim (um teste confere). As três marcas entram na lista,
  com o mesmo cuidado (área pequena, nada que acenda a tela). Com movimento reduzido, nada se repete.
- **Onde mexe:** `PlayerField.tsx` (`Zones`), `icons.tsx`, `styles.css`.

### 3.4 A cura passiva que se explica (ponto 9)

- **O que muda:** no instante em que a numérica da Defesa cai com 2 K na Guarda, os **K acendem** (a causa), a carta solta uma **essência
  verde** que corre até o seu Coringa, e o "+N" nasce no retrato, enchendo a barra. Na primeira cura da partida, uma faixa explica a regra em
  uma linha, com a conta ("6 × (1 + 2 Q) = 18").
- **Onde mexe:** a batida do `Healed` com `reason: 'DEFENSE'` (o evento já diz a carta). A essência sai da cópia da carta que vai ao
  cemitério (`Leaving.tsx`), e o "+N" já existe no placar. A "primeira da partida" fica na sessão.
- **Tutorial:** a dica da cura passiva ganha uma linha.

## 4. Bloco B: o golpe final (ponto 15)

- **Quando:** o ataque comum (o `DamageDealt` que não está dentro de outra cena) leva a vida do outro a zero, e a partida acaba no mesmo
  passo (`GameOver` por vida). O Ataque Absoluto, o Reflect e a Exódia já têm cena e ficam como estão.
- **A cena (~2,2 s):** as tarjas de cinema descem **abaixo do placar** (o placar fica à vista, como em todas as cenas); a sua fileira de
  Ataque acende carta a carta; o corte atravessa a mesa até o retrato do outro; no impacto, a tela inverte uma vez (≥ 300 ms, a regra de
  fotossensibilidade) e treme; a barra dele zera e o retrato racha; o carimbo **GOLPE FINAL!** cai. Depois, o painel do fim de hoje.
- **Quem perde:** a mesma cena espelhada (o corte vem do campo dele), e o carimbo diz **DERROTA**.
- **Variantes:** A, corte com congelamento (recomendada); B, câmera lenta, sem inverter.
- **Onde mexe:** uma cena nova no módulo das cenas (`ui/scenes/`), a classificação em `timeline.ts`, os instantes em `scene-moments.ts`, a
  folga em `SCENE_MS` (o prazo do servidor e a espera do bot), os sons. O toque pula, como nas outras.

## 5. Bloco C: o poder que cresce

### 5.1 Os bônus em escala (ponto 10)

A mesma escada nas três zonas, cada uma com a sua cor:

| Cartas | J (Bônus de ataque) | Q (Bônus de defesa) | K (Guarda) |
|---|---|---|---|
| 1 | nada | nada | nada |
| 2 | aceso (contorno de ouro) | aceso (brilho de papel) | cura passiva (pulso verde) |
| 3 | faíscas (raios pequenos entre os J) | muralha (o escudo se ergue atrás) | **ameaça de Exódia** (brasa vermelha e a coroa tracejada) |
| 4 | Ataque Absoluto (a aura do Ataque Absoluto em volta) | Defesa Absoluta (o escudo de ouro) | Exódia (a partida acaba) |

- **Cuidado:** os raios são pequenos e no máximo 3 por segundo; a aura usa as formas de `ui/scenes/aura.ts` (as mesmas da cena). Tudo
  some com o movimento reduzido, menos as cores.
- **Uma mudança de leitura do jogo:** com 3 K, os dois lados veem o aviso "falta 1 K para a Exódia". A Guarda já é pública; hoje o
  oponente precisa contar. Pergunta para o autor na §9.
- **Onde mexe:** `PlayerField.tsx` (as zonas), `styles.css`, uma camada de efeitos para os raios (a `FxLayer` da fatia 5).

### 5.2 A aura da iniciativa (ponto 11)

- **O que muda:** o Coringa de quem segura a iniciativa por várias rodadas de Ataque seguidas ganha uma aura em volta do retrato no placar:
  **3** rodadas, a brasa (um contorno baixo que tremula); **5**, a chama (labaredas e brasas subindo); **10**, a super aura (núcleo
  branco-quente, chama alta e raios pequenos). Um selo "×N" ao lado do retrato. Quando a iniciativa troca de mão, a aura apaga de uma vez.
- **"Seguidas":** as rodadas de Ataque que terminaram (`InitiativeDecided`) com a iniciativa no mesmo jogador, contando a de agora.
- **Onde mexe:** o motor passa a contar a sequência (`initiativeStreak` no estado e na `view`, e no evento `InitiativeDecided`). Derivar
  na interface a partir dos eventos perderia a conta numa recarga. Não muda nenhuma partida (as regras são as mesmas), mas muda a forma do
  estado: sobe o `STATE_SCHEMA` do servidor (as salas abertas fecham no deploy) e o esquema do protocolo. O digest das partidas de
  referência (`RULES_DIGESTS`) conta os eventos por tipo, não a forma deles, então o campo novo no `InitiativeDecided` não o muda e não
  pede `RULES_VERSION`; o plano confere isso rodando os testes do motor, e confere o digest do texto do `pnpm play` (`sim/test/online.test.ts`)
  se o histórico passar a falar da sequência.
- **Desenho:** a aura usa as formas de `ui/scenes/aura.ts`, com camadas menores. O retrato do placar fica no topo, e a aura passa por cima
  da barra de vida sem cobri-la (ela é mais estreita que o retrato no celular; confiro nas fotos do plano).

### 5.3 A espada e o escudo de quem lidera (ponto 13)

- **O que muda:** quem tem o **Ataque maior** (o total do motor, comparando os dois Ataques) ganha a espada com fundo de ouro, a moldura e
  o brilho que passa, como a carta da quadra; o mesmo com a **Defesa maior** e o escudo. No empate, ninguém. Quando a liderança troca, o
  ouro passa de um campo ao outro com um sopro.
- **Onde mexe:** `Row.tsx` (a figura antes do total), com os totais que a fileira já mostra (os que esperam o pouso, da fatia 5).

## 6. Bloco D: identidade

### 6.1 Os botões da jogada (ponto 5)

- **O que muda:** botões de **carimbo de madeira**: borda grossa de tinta, sombra dura, a tipografia dos títulos e o grão de papel. No
  toque, o carimbo afunda (a sombra some) e solta pingos de tinta. O **Atacar** é o maior e o único vermelho, com a espada e a prévia numa
  tira de papel; armado para o Ataque Absoluto, ganha a borda de ouro, a etiqueta e uma faísca que corre a borda. **Passar** é de papel,
  **Confirmar** é de ouro, **Desfazer** e **Recomeçar** viram selos redondos com o desenho girando no toque.
- **Variantes:** A, carimbo (recomendada); B, cartaz rasgado.
- **Cuidado:** alvo de toque ≥ 44 px, o contorno de foco do teclado (ouro com borda de tinta) visível em todos, e nada se mexe com o
  movimento reduzido (o afundar vira só a troca de cor).
- **Onde mexe:** `ActionBar.tsx`, `controls.tsx`, `EquipPanel.tsx`, `OrderPanel.tsx`, `ReactionPanel.tsx`, `styles.css`.

### 6.2 O monte e o cemitério no centro (ponto 14)

- **O que muda:** a faixa do meio engorda (~30 px no celular, mais no PC) e o monte e o cemitério vão para o **centro**, lado a lado, com a
  situação da rodada à esquerda e o treino/relógio à direita. O cemitério vira uma **lápide** de pedra gravada, com a conta e as cartas do
  topo encostadas nela; a carta que chega cai com poeira.
- **Variantes:** A, lápide (recomendada: a carta do topo continua à vista, e ela importa para a Ressurreição); B, cova aberta.
- **Risco:** o PC de pouca altura (1366 × 657) precisa caber sem rolar (spec da web §3.3), e o celular de 360 × 640 já rola os campos.
  A faixa mais alta come altura dos campos: no PC baixo ela fica compacta. As fotos das quatro telas entram no plano, com o E2E de
  1366 × 657 que já existe.
- **Onde mexe:** `CenterBand.tsx`, `GraveyardDialog.tsx` (só o gatilho), `styles.css`; as âncoras `data-monte` e `data-cemiterio` (os voos
  da fatia 5 e as cenas medem por elas) continuam.

## 7. Bloco E: a Ressurreição no instante da quadra (ponto 16)

### 7.1 O que os números dizem

Em 2.000 partidas (greedy × greedy, `notas/medicao-ponto-16.md`):

- 72,7% das quadras se formam na **revelação do Equipar**; o resto, por Roubo (21,4%) ou pela própria Ressurreição (5,8%).
- Em **47,8%** das quadras da revelação, as **duas fileiras já estão cheias**: hoje a Ressurreição fica parada até um golpe abrir vaga.
  Em 44,3% das vezes que o jogador tinha uma Ressurreição na fase principal, ele não podia usar.
- **54,9%** dos donos atacam **em segundo** na rodada seguinte: hoje eles só ressuscitam depois de levar o golpe do outro.
- Os dois formando quadra na mesma revelação: 76 vezes em 2.000 partidas.

### 7.2 A regra proposta (a confirmar na §9)

1. **Quando:** logo depois da revelação do Equipar que formou a quadra, antes da escolha da ordem do Ataque, abre uma **janela da
   Ressurreição** para quem formou quadra.
2. **Iniciativa:** se os dois formaram, quem tem a iniciativa decide primeiro; o outro decide vendo a jogada dele.
3. **Opcional:** na janela, o jogador usa ou guarda. A Ressurreição guardada continua valendo como hoje (fase principal, enquanto a quadra
   existir, com a garantia de 3 rodadas).
4. **Fileira cheia:** se a fileira escolhida está cheia, a carta ressuscitada **substitui a última** dela; a substituída vai ao cemitério
   (e cura, se era da Defesa com 2 K na Guarda, como a troca do Equipar). Vale em qualquer Ressurreição, também na fase principal. Com
   vaga, ela entra no fim, como hoje.
5. **Em cadeia:** se a carta ressuscitada forma outra quadra, a nova Ressurreição pode ser usada na mesma janela.
6. **A carta substituída** não pode ser a ressuscitada no mesmo passo (escolhe-se do cemitério de antes da troca).

### 7.3 O que muda no código

- **Motor:** uma fase nova (`RESURRECTION`, com a fila de quem decide), as jogadas `RESURRECT` (com a troca) e `PASS` nela, a troca também
  na fase principal, a reavaliação das quadras, a cura da substituída. Testes de unidade e as invariantes.
- **Bots:** o greedy e o `eval` aprendem a janela (e a troca); a busca do Difícil a enxerga.
- **Simulador:** calibração e o portão do Difícil remedidos (`--recomecar`, porque muda regra).
- **Partidas de referência:** mudam; sobe `RULES_VERSION`, novo digest, replays regravados.
- **Servidor:** o prazo da janela nova; sobe o `STATE_SCHEMA`.
- **Web:** a janela (o cemitério para escolher, a fileira e a prévia da troca), a cena da Ressurreição de hoje no fim, o tutorial.
- **Regras na spec:** §1.8 da spec das regras.

## 8. Restrições que valem para todos

- **Fotossensibilidade** (spec da web §10.4): no máximo 1 inversão por cena, ≥ 300 ms; nunca mais de 3 trocas claro ↔ escuro em 1 s; com
  movimento reduzido, nenhuma inversão.
- **Movimento reduzido:** cada ponto tem a sua forma parada (descrita acima e no protótipo).
- **Ritmo:** ≥ 50 quadros/s com a CPU 4× (a medição da fatia 5), conferido com o `medir-cena.ts` em cada bloco.
- **Telas:** 360 × 640 no celular, 1366 × 657 no PC baixo, sem rolar de lado.
- **Arte original** (§10.6), **números sem textura** (§10.7), **sem regra na interface** (os números vêm do motor).
- **O histórico continua** com todas as linhas: os momentos novos não o substituem.

## 9. Perguntas para o autor

A mais importante em cima. Onde há recomendação, ela está entre parênteses.

1. **A regra do 16** (§7.2): a janela logo depois da revelação do Equipar, quem tem a iniciativa decide primeiro, opcional (guarda para a
   fase principal), a troca da última carta em qualquer Ressurreição com a fileira cheia, a substituída curando como no Equipar. (Recomendo
   tudo como está na §7.2.)
2. **A ordem dos blocos** (§2): A, B, C, D, com o E em paralelo. (Recomendo essa.)
3. **As variantes do protótipo:** 1, 2, 5, 14 e 15. (Recomendo A em todas.)
4. **O aviso da ameaça de Exódia** com 3 K, visto pelos dois lados (§5.1). (Recomendo sim.)
5. **A espada e o escudo** comparam Ataque com Ataque e Defesa com Defesa (§5.3). (Recomendo a leitura literal.)
6. **A aura da iniciativa** conta as rodadas de Ataque seguidas e apaga quando a iniciativa troca; o motor passa a contar, e as salas
   online abertas fecham no deploy (§5.2). (Recomendo sim.)
7. **O momento da especial** estende o prazo online da decisão, como as cenas (§3.1). (Recomendo sim.)
8. **A fatia 5:** você jogou e mandou os pontos novos, mas não disse se ela está aprovada. Com ela aprovada, o sub-projeto 6 fecha.

## 10. Escolhas que fiz (para conferir ao ler)

- A especial do oponente ganha o momento; as suas, não.
- O momento não encolhe no teto de 1 s da decisão pendente.
- A linha do que a marca faz some no celular.
- A faixa da cura passiva só na primeira cura de cada partida.
- A sequência da iniciativa é contada pelo motor, não pela interface.
- As tarjas do golpe final ficam abaixo do placar; a derrota usa a mesma cena, espelhada.
- Na regra do 16: a troca vale também na fase principal; a substituída cura como no Equipar; a cadeia de quadras continua na mesma janela.
