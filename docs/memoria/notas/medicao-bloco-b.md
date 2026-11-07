# Medição do bloco B (o golpe final, ponto 15)

- **Data:** 2026-11-07, na branch `feat/playtest-bloco-b`, com a web construída (`pnpm --filter @coringa/web build`).
- **Script:** `packages/web/e2e/medir-cena.ts`, com `medir.config.ts`, na porta 8787 (livre). Build de produção, Chromium do Playwright, CPU 4×
  (`Emulation.setCPUThrottlingRate`), telas de 1366 × 768 e 360 × 640 (as do script; o PC baixo de 1366 × 657 fica com o E2E de layout, que
  não passa por esta cena).
- **As duas cenas:**
  - **a sua vitória:** `especiais.json`, rodada 37, do passo 178 para o 179 (o seu golpe comum de 195 derruba o Bot, que fica com -118 no
    motor e 0 no placar);
  - **a sua derrota:** `absolutos.json`, rodada 21, do passo 99 para o 100 (o golpe comum de 184 do Bot derruba você).
- **Comando** (fotos em 300, 640, 1040 e 2000 ms depois do clique, fora do repositório):

  `MEDIR_FIXTURE=especiais MEDIR_RODADA=37 MEDIR_PASSO=178 MEDIR_MS=2400 MEDIR_FOTOS=300,640,1040,2000 MEDIR_SAIDA=<pasta> pnpm --filter @coringa/web exec playwright test --config medir.config.ts`

## Números (CPU 4×)

| Cena | Tela | Quadros/s | p95 (ms) | Maior intervalo (ms) | Chegada (ms) | Pico de partículas |
|---|---|---|---|---|---|---|
| Vitória | 1366 × 768 | 59 | 17 | 33 | 50 | 21 |
| Vitória | 360 × 640 | 58 | 17 | 67 | 67 | 20 |
| Derrota | 1366 × 768 | 60 | 17 | 33 | 50 | 20 |
| Derrota | 360 × 640 | 60 | 17 | 33 | 67 | 20 |

Meta: ≥ 50 quadros/s e ≤ 60 partículas. Dentro dela nas quatro.

## O que as fotos mostram

- **300 ms:** a fileira de Ataque de quem bate acende carta a carta (7 das 8 aos 300 ms; a última aos 289 ms, ainda entrando); as tarjas
  estão no lugar, abaixo do placar; nenhuma cortina.
- **640 ms (o impacto):** a tela invertida; o corte vai do meio da fileira até o retrato do outro, no PC e no celular em pé (no celular, os
  campos rolaram até a fileira de quem bate); o número do golpe entrando grande.
- **1040 ms:** o carimbo assentado no meio da faixa, inteiro a 360 px; a vida do derrotado em 0, o retrato rachado e o número ao lado do
  retrato.
- **2000 ms:** a mesa de volta às cores; o carimbo ainda no ar; o halo da fileira e o retrato rachado. Na derrota, o carimbo cai sobre a
  fileira de Ataque do Bot (a de cima), que já acendeu e já cortou: nada que ainda importa fica coberto.
- **Não conferido de verdade:** o som (os testes conferem os instantes), o movimento reduzido no navegador (só nos testes de unidade) e o
  online (o deploy é do autor).
