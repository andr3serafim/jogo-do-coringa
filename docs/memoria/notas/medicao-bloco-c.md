# Medição do bloco C (o poder que cresce, pontos 10, 11 e 13)

- **Data:** 2026-11-08, na branch `feat/playtest-bloco-c`, com a web construída (`pnpm --filter @coringa/web build`).
- **Script:** `packages/web/e2e/medir-cena.ts`, com `medir.config.ts`, na porta 8787 (livre). Build de produção, Chromium do Playwright, CPU 4×,
  telas de 1366 × 768 e 360 × 640 (as do script). O PC baixo (1366 × 657) ficou com o E2E (`e2e/power.spec.ts`).
- **O que se mede:** 3 s depois do clique em "Próximo passo": as batidas do passo e a mesa parada logo depois, com o que estiver fervendo.

## Números (CPU 4×)

| Mesa | Passo | Tela | Quadros/s | p95 (ms) | Maior intervalo (ms) | Pico de partículas |
|---|---|---|---|---|---|---|
| A mais cheia: sua sequência ≥ 10 (a super aura), 3 K (a brasa), Q acesos, os dois ouros de líder | `especiais.json`, 173→174 | 1366 × 768 | 50 | 33 | 167 | 9 |
| | | 360 × 640 | 55 | 17 | 117 | 9 |
| Os 4 J armados (a aura na zona), Q a um do limite, a sequência 3 (a brasa) | `especiais.json`, 98→99 | 1366 × 768 | 53 | 33 | 150 | 6 |
| | | 360 × 640 | 55 | 33 | 100 | 6 |
| A troca de mão depois de 10 rodadas do Bot (o sopro) | `exodia-devastacao.json`, 236→237 | 1366 × 768 | 42 | 50 | 167 | 6 |
| | | 360 × 640 | 48 | 33 | 217 | 6 |

**A linha de base** (a web da `main`, `792bd62`, nos mesmos passos, medida em seguida na mesma máquina):

| Mesa | Tela | Quadros/s | p95 | Maior intervalo |
|---|---|---|---|---|
| A troca de mão (236→237) | 1366 × 768 | 41 | 50 | 183 |
| | 360 × 640 | 47 | 33 | 183 |
| A mais cheia (173→174) | 1366 × 768 | 53 | 33 | 133 |
| | 360 × 640 | 55 | 17 | 117 |

## Leitura

- **A mesa mais cheia passa na meta** (≥ 50 quadros/s, ≤ 60 partículas): o bloco C custa ~3 quadros/s no PC (53 → 50) e nada no celular. O
  relógio único e o agendador único seguram: no máximo 9 partículas no ar. Não foi preciso parar as formas (a saída da C4).
- **A troca de mão fica abaixo de 50, mas já ficava sem o bloco C** (41 e 47 na `main`): o passo 236→237 vira a rodada inteira (a decisão
  da iniciativa, o Equipar que distribui as cartas dos dois). O bloco C não piora (42 e 48). Fica como achado para o autor, fora deste
  bloco.
- **As fotos** (300, 1.200 e 2.900 ms): a super aura atrás do seu retrato, com o selo ×11 e o nome e a barra por cima; a brasa nos seus 3 K, os
  Q acesos em papel e os medalhões de ouro no seu Ataque e na sua Defesa; os 4 J com a aura do Ataque Absoluto subindo, sem cobrir os K da
  Guarda de cima. Nada vira um carnaval: cada efeito fica na zona dele, e só a aura do retrato e a dos 4 J se mexem o tempo todo.
- **Não conferido de verdade:** o movimento reduzido no navegador (só nos testes de unidade) e o online (o deploy é do autor).

## Depois da revisão da branch (2026-11-09)

- **Qual mesa é "a mais cheia":** a do plano, Task 5, Step 3 (`especiais.json` 173→174), sem os 4 J armados. O foco 3 da revisão do plano
  pede os 4 J armados junto, mas nenhuma fixture tem os 4 J armados com a sequência ≥ 5 (contado com o motor: os 4 J armados duram no máximo
  4 passos em todas). As duas auras de 3 camadas fervendo juntas (a do retrato e a da zona) não foram medidas; a mesa mais cheia mediu 50
  cravado no PC. Fica para o autor: aceitar assim, ou gravar uma partida com essa mesa para medir.
- **Fotos novas** (Playwright, fora do repositório): no celular, a aura dos 4 J do passo 99 subia por cima dos títulos "Bônus de ataque" e
  "Bônus de defesa"; com o título da zona por cima das camadas de poder, os dois ficam legíveis. O anel do arrasto nas cartas do Bot (os 2 K
  da Guarda, passo 78) foi fotografado com o empilhamento por carta e com ele na lista: com 3 px entre as cartas, os dois anéis se fundem
  numa faixa tracejada só nos dois casos, e ficou como estava.
- O ouro de quem lidera no PC passou de 36 para 32 px (o anel de 4 px, como no celular): em repouso ele passava 1,5 px da linha do total.
