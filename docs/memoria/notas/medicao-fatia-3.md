# Medição da Exódia e da Devastação (sub-projeto 6, fatia 3)

Spec 6 §11: meta de ≥ 50 quadros por segundo nas cenas com a CPU 4× mais lenta no Chromium; no máximo ~60 partículas vivas.

## Como foi medido (2026-11-01)

- **Build:** o de produção (`vite build` + `vite preview` na porta 4173), sem o servidor: o replay roda no navegador.
- **Navegador:** Chromium do Chrome DevTools MCP, CPU 4× mais lenta.
- **Partida:** o replay da fixture do E2E (`packages/web/e2e/fixtures/exodia-devastacao.json`, semente `fatia3-0`, turtle × turtle):
  - do passo 210 para o 211 (rodada 43), a sua Devastação derruba a Defesa do Bot, com 8 cartas;
  - do passo 407 para o 408 (rodada 83), o Bot fecha a Exódia.
- **Medida:** um laço de `requestAnimationFrame` desde o clique em "Próximo passo" até o fim da cena (3,2 s e 5,9 s). Ele conta os
  quadros, o maior intervalo, o p95, os quadros acima de 50 ms e o pico de `[data-particula]` vivas.

## Resultado

| Tela | Cena | Quadros/s | Maior quadro | p95 | Quadros > 50 ms | Partículas no pico |
|---|---|---|---|---|---|---|
| PC 1366 × 768 | Devastação | 87,7 | 225 ms | 17 ms | 2 | 30 |
| PC 1366 × 768 | Exódia | 99,9 | 183 ms | 17 ms | 2 | 18 |
| Celular 390 × 844 (2×, toque) | Devastação | 94,1 | 225 ms | 17 ms | 2 | 30 |
| Celular 390 × 844 (2×, toque) | Exódia | 101,8 | 200 ms | 17 ms | 1 | 19 |

- **Meta:** as duas cenas passam folgado de 50 quadros por segundo nas duas telas, e as partículas ficam na metade do teto de 60.
- **Mais de 60 quadros por segundo:** a tela do Chromium da medição desenha a mais de 60 Hz.
- **O maior quadro (183 a 225 ms):** é o da chegada do passo, quando a mesa troca de estado e a cena monta. É o mesmo quadro pesado
  das fatias 1 e 2, candidato à fatia 5 (fluidez).
- **O filtro do abismo:** não pesou. Ele fica num `<svg>` próprio, desenhado uma vez, e o que anima é o elemento de fora.

## O que foi visto no navegador

- **PC:** a Devastação inteira (o ronco, a fenda, a inversão na abertura, o carimbo e o campo desolado depois) e a Exódia inteira (os K
  e os pilares, a coroa, o carimbo, o retrato rachado com a vida a 0).
- **Celular:** a Devastação a 360 × 640, com os campos rolados para longe: a cena rola até a fileira.
- **Achado só no navegador, corrigido:** o tremor do campo abria uma barra de rolagem de lado nos campos. Hoje os campos não rolam de
  lado, e o E2E confere.

## O que não foi conferido de verdade

- **O som:** os testes conferem os instantes das vozes, não o ouvido.
- **A cancelada e a refletida:** só nos testes de unidade. Nenhuma partida da busca com bots cancelou a Devastação (nos 467 casos, todas
  as fileiras caíram), e a refletida não foi procurada.
- **O movimento reduzido:** só nos testes de unidade.
