# Medição da fluidez (sub-projeto 6, fatia 5)

Spec 6 §11: meta de ≥ 50 quadros por segundo com a CPU 4× mais lenta no Chromium e no máximo ~60 partículas vivas. A fatia 5 mede também a
**chegada**: o maior intervalo entre quadros nos 300 ms depois do toque no "Próximo passo", o quadro em que o passo chega à mesa. Antes, as
notas das fatias 1 a 4b o achavam de 100 a 225 ms em todas as cenas.

## Como foi medido (2026-11-02)

- **Script:** `packages/web/e2e/medir-cena.ts`, com `medir.config.ts`. `MEDIR_PORTA=8797`, porque um `wrangler dev` do autor estava na 8787.
  O `MEDIR_PERFIL=1` grava o perfil do Chromium; com ele, os números não valem (o rastreamento pesa), e o perfil serve só para ver do que
  cada quadro é feito.
- **Build:** o de produção, servido pelo `wrangler dev` da medição. Chromium do Playwright, CPU 4× (`Emulation.setCPUThrottlingRate`), tela
  de 60 Hz, `MEDIR_MS=1500`.
- **Passos** (fixture `especiais`, a sua partida contra o Bot), com a rodada e o passo de antes do toque:
  - **jogada:** rodada 3, passo 6 (o seu J);
  - **armadilha:** rodada 5, passo 18;
  - **ataque:** rodada 3, passo 9 (o golpe comum e a fileira gasta);
  - **compra:** rodada 1, passo 1 (o começo do Equipar, com as duas compras).
  - Nenhuma fixture tem um `GuardBroken` de 2 K ou mais fora de uma cena: o Ataque Absoluto o traz no mesmo passo. A armadilha ficou no
    lugar dele, como o plano previa.

## Antes (a `main` em `35b4660`)

| Passo | Tela | Quadros/s | p95 | Maior quadro | Chegada |
|---|---|---|---|---|---|
| jogada | PC 1366 × 768 | 54 | 33 | 100 | 100 |
| jogada | 360 × 640 | 56 | 17 | 83 | 83 |
| armadilha | PC | 58 | 17 | 33 | 100 |
| armadilha | 360 | 54 | 17 | 100 | 100 |
| ataque | PC | 48 | 33 | 100 | 167 |
| ataque | 360 | 49 | 33 | 83 | 167 |
| compra | PC | 59 | 17 | 33 | 183 |
| compra | 360 | 59 | 17 | 33 | 200 |

- O "maior quadro" deixa de fora os 5 primeiros; quando o toque cai neles, só a `chegada` o vê.
- **O ataque comum já ficava abaixo da meta** (48 e 49), antes de qualquer efeito desta fatia.
- Uma execução só varia bastante (o mesmo ataque deu de 38 a 48 quadros/s no PC). As comparações abaixo usam três execuções de cada lado.

## O que o perfil mostrou

- **A chegada não é um quadro só.** É uma sequência de tarefas sem quadro entre elas:
  - o desenho do React com a mesa inteira, no toque, com o recálculo de estilo, o `Layerize` e a pintura;
  - o JS do Motion, que mede as cartas com `layoutId` e começa as projeções (`calcProjection`, `applyProjectionStyles`);
  - um ou dois layouts novos, de 8 a 27 ms cada, com pintura.
- **Uma causa local, no ataque:** o palco recebia `--tremor` e `--tremor-ms` no estilo inline a cada golpe. Variável CSS é herdada, então o
  Chromium recalculava o estilo de toda a mesa: 530 elementos, ~100 ms com a CPU 4×. O rastreamento de invalidação do perfil mostrava a
  causa: "Inline CSS style declaration was mutated", no `div` do palco.
- **O resto não é local:** o desenho do React e as projeções do Motion em toda carta com `layoutId`. Mexer nisso é mudar a forma da mesa
  (memorizar os componentes da mesa, ou tirar o `layoutId` de parte das cartas): pela E1 do plano, fica para o autor decidir.

## O conserto (Task 1)

O tremor virou uma animação (Web Animations, no `translate`) no placar e nos campos, disparada pelo `Stage` a cada batida com golpe. O palco
não recebe mais variável nenhuma, e a regra do `styles.css` saiu. De quebra, dois golpes seguidos do mesmo peso agora tremem duas vezes
(antes, a animação do CSS não recomeçava quando o valor de `data-tremor` se repetia).

Ataque, três execuções de cada lado:

| Tela | Antes: quadros/s | Antes: chegada | Depois: quadros/s | Depois: chegada |
|---|---|---|---|---|
| PC 1366 × 768 | 40, 41, 38 | 183, 200, 183 | 48, 45, 46 | 117, 117, 117 |
| 360 × 640 | 53, 47, 50 | 167, 183, 167 | 53, 47, 49 | 117, 100, 133 |

A jogada, depois: 56 quadros/s e chegada de 83 ms nas duas telas.

## Depois (Task 9)

Os mesmos quatro passos, com todos os efeitos da fatia e os pontos diretos do playtest, três execuções de cada (`MEDIR_PORTA=8797`).

**A primeira medida reprovou dois passos** (meta de 50 quadros/s):
- **a compra:** 43 a 51 quadros/s, contra 59 antes da fatia. As seis cartas do Equipar pousam juntas com 30 puffs de poeira, e cada pouso redesenhava a fileira, uma carta de cada vez;
- **o ataque no PC:** 42 a 50, mas ele já ficava abaixo antes da fatia (38 a 41).

**Os dois cortes, como o plano manda (§11: primeiro a poeira e os cacos):**
- a poeira ganhou um teto por batida, como os cacos (`dustPerCard`: 5 por carta, 10 por batida);
- o `Row` junta os pousos do mesmo instante num desenho só.

| Passo | Tela | Quadros/s | Chegada (ms) | Partículas no pico |
|---|---|---|---|---|
| jogada | PC | 60, 56, 56 | 67, 100, 83 | 5 |
| jogada | 360 | 60, 57, 57 | 50, 83, 83 | 5 |
| armadilha | PC | 53, 53, 54 | 133, 117, 117 | 10 |
| armadilha | 360 | 54, 54, 59 | 117, 100, 100 | 10 |
| ataque (depois dos cortes) | PC | 56, 53, 53 | 117, 117, 134 | 0 |
| ataque (depois dos cortes) | 360 | 57, 57, 55 | 100, 100, 100 | 0 |
| compra (depois dos cortes) | PC | 59, 58, 52 | 183, 183, 183 | 18 |
| compra (depois dos cortes) | 360 | 58, 57, 50 | 167, 167, 200 | 18 |

- **A meta passa** em todos os passos, nas duas telas, e as partículas ficam abaixo de 60. A jogada e a armadilha foram medidas antes dos cortes, que não mexem nelas.
- **A chegada:** o ataque caiu de 167–200 para 100–134 ms (o tremor da Task 1); a jogada e a armadilha ficam onde estavam; a compra também (167 a 200). O resto do peso é o desenho do React e as projeções do Motion: fica para o autor (E1).
- **Uma execução só varia bastante:** a mesma compra deu de 43 a 59 quadros/s em rodadas diferentes da mesma tarde. As decisões acima usaram três rodadas.

## O que foi visto nas fotos

- **A jogada** (o K na Guarda): o voo, e o pouso no lugar, sem deslocamento do achatamento.
- **A Armadilha:** a cópia do J♥ rachada no lugar, os cacos aos 160 ms, o J♥ no topo do cemitério depois, e a cópia do A♣ indo ao cemitério.
- **O ataque:** o 8♠ gasto e o 9♣ do Bot seguram o lugar até a batida deles.
- **A compra:** a carta do Bot que cai e assenta com poeira; o verso novo voa do monte, e o que já estava na mão fica parado (o defeito que as fotos acharam e que foi corrigido).

## O que não foi visto

- **O som:** os testes medem os instantes e o volume, não o ouvido.
- **O movimento reduzido:** só nos testes de unidade.
- **O painel do Equipar ao vivo:** o leque das numéricas dele só tem teste de unidade; o replay usa um painel próprio, sem leque.
