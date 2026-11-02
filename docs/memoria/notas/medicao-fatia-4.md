# Medição do Reflect (sub-projeto 6, fatia 4)

Spec 6 §11: meta de ≥ 50 quadros por segundo nas cenas com a CPU 4× mais lenta no Chromium; no máximo ~60 partículas vivas.

## Como foi medido (2026-11-02)

- **Build:** o de produção, servido pelo `wrangler dev` do E2E.
- **Navegador:** o Chromium do Playwright, com `Emulation.setCPUThrottlingRate` em 4×, numa tela de 60 Hz.
- **Partida:** o replay da fixture do E2E (`packages/web/e2e/fixtures/reflect.json`, semente `fatia4-220`, greedy × turtle):
  - do passo 175 para o 176 (rodada 37), o Bot joga o Reflect contra o seu ataque;
  - do passo 176 para o 177, o golpe volta, com 49 de dano em você.
- **Medida:** um laço de `requestAnimationFrame` durante a cena, sem os 5 primeiros quadros. Ele conta os quadros, o maior intervalo, o p95 e o pico de
  `[data-particula]` vivas. O script foi temporário e não ficou no repositório.

## Resultado

| Tela | Cena | Quadros/s | Maior quadro | p95 | Partículas no pico |
|---|---|---|---|---|---|
| PC 1366 × 768 | O espelho se forma | 55 | 33 ms | 33 ms | 24 |
| PC 1366 × 768 | O cometa | 52 | 117 ms | 33 ms | 34 |
| Celular 360 × 640 | O espelho se forma | 55 | 133 ms | 17 ms | 24 |
| Celular 360 × 640 | O cometa | 56 | 100 ms | 17 ms | 34 |

- **Meta:** as duas cenas passam de 50 quadros por segundo nas duas telas, e as partículas ficam em pouco mais da metade do teto de 60.
- **Menos folga que na fatia 3 (≥ 87):** as medidas não são comparáveis. Aquela tela desenhava a mais de 60 Hz; esta para em 60.
- **O maior quadro (100 a 133 ms):** é o da chegada do passo, o mesmo das fatias anteriores, candidato à fatia 5 (fluidez).

## O que foi visto no navegador

Por fotos, no PC e no celular em pé: o espelho formado com as três cartas nas pontas, a cortina, a carga com os fios, o cometa com as duas caudas e os anéis, a
inversão com o número e o nome, e os cacos com as cartas caindo.

**Dois defeitos que os testes em jsdom não mostravam, achados por essas fotos e corrigidos:**

- **O espelho e o cometa fora do lugar:** a cena media a mesa antes de ela assentar. A zona "Reflect ativo", que entra e sai no mesmo commit, muda a altura dos
  campos, e o cometa saía ~60 px abaixo da fileira. Agora a cena mede num `useLayoutEffect` (`ui/scenes/measured-box.ts`).
- **A cena de 3,8 s sem cortina:** o espelho, a faixa da reação e o gatilho logo depois somavam trocas demais em 1 s, e a cortina recusada não tentava de novo.
  Agora ela sobe quando a regra deixa, se ainda faltarem 2 s de cena.

## O que não foi visto

- **O som:** os testes medem os instantes e o volume, não o ouvido.
- **Reflect contra Reflect:** nenhuma das 3.771 partidas de bots da busca anulou (os bots não usam `CANCEL_REFLECT`). Só nos testes de unidade.
- **O dano 0** (5 partidas na busca, nenhuma na fixture), **o seu próprio Reflect** (a fixture tem o do Bot), **o Ataque Absoluto contra Reflect** e **o movimento
  reduzido:** só nos testes de unidade.
