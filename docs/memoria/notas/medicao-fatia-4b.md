# Medição da Ressurreição (sub-projeto 6, fatia 4b)

Spec 6 §11: meta de ≥ 50 quadros por segundo nas cenas com a CPU 4× mais lenta no Chromium; no máximo ~60 partículas vivas.

## Como foi medido (2026-11-02)

- **Build:** o de produção, servido pelo `wrangler dev` do E2E.
- **Navegador:** o Chromium do Playwright, com `Emulation.setCPUThrottlingRate` em 4×, numa tela de 60 Hz.
- **Partida:** o replay da fixture do E2E (`packages/web/e2e/fixtures/exodia-devastacao.json`, semente `fatia3-0`, turtle × turtle):
  - do passo 27 para o 28 (rodada 7), a sua Ressurreição, com a quadra de 9 na fileira de destino;
  - do passo 107 para o 108 (rodada 23), a do Bot, com a quadra de 2 na outra fileira.
- **Medida:** um laço de `requestAnimationFrame` durante os 4,6 s da cena, sem os 5 primeiros quadros. Ele conta os quadros, o maior intervalo, o p95 e o pico de
  `[data-particula]` vivas. O script foi temporário e não ficou no repositório.

## Resultado

| Tela | Cena | Quadros/s | Maior quadro | p95 | Partículas no pico |
|---|---|---|---|---|---|
| PC 1366 × 768 | A sua | 60 | 33 ms | 17 ms | 45 |
| PC 1366 × 768 | A do Bot | 57 | 150 ms | 17 ms | 45 |
| Celular 360 × 640 | A sua | 58 | 117 ms | 17 ms | 45 |
| Celular 360 × 640 | A do Bot | 59 | 33 ms | 17 ms | 45 |

- **Meta:** passa de 50 quadros por segundo nas duas telas, e as partículas ficam abaixo do teto de 60.
- **O maior quadro (até 150 ms):** é o da chegada do passo, o mesmo das fatias anteriores, candidato à fatia 5 (fluidez).

## O que foi visto no navegador

Por fotos, no PC e no celular em pé, a sua e a do Bot: as cartas da quadra acesas, os fios, o portal com os raios e as plumas, a coluna até o cemitério, a carta sem cor com a
auréola, o nome carimbado, e a carta pousada na vaga certa, ao lado da quadra.

**Um defeito que os testes em jsdom não mostravam, achado por essas fotos e corrigido:** as cópias da quadra tinham 6 px de largura. A carta usa `w-full`, e o elemento em volta
encolhia até o conteúdo: via-se a carta real sob a cortina, com o halo por cima e um ponto escuro. Agora o E2E confere a largura da cópia.

## O que não foi visto

- **O som:** os testes medem os instantes e o volume, não o ouvido.
- **O movimento reduzido:** só nos testes de unidade.
- **Duas quadras na mesa:** a escolha da quadra só nos testes de unidade; a partida da fixture não tem o caso em que ela acenderia "a outra".
