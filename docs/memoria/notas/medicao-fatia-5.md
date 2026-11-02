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

A preencher com os mesmos quatro passos, depois dos efeitos da fatia.
