# Medição do bloco A dos pontos do playtest (o momento e a cura que se explica)

Spec do playtest §8: ≥ 50 quadros por segundo com a CPU 4× mais lenta no Chromium, ≤ 60 partículas vivas, e as fotos nas duas telas. O
plano (`docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`, Task 8) pede o momento de uma especial do Bot e a cura passiva.

## Como foi medido (2026-11-03)

- **Script:** `packages/web/e2e/medir-cena.ts`, com `medir.config.ts`, na porta 8787 (livre). Build de produção, Chromium do Playwright, CPU 4×
  (`Emulation.setCPUThrottlingRate`), tela de 60 Hz. Os números saem de uma passada só, sem o perfil.
- **Passos** (fixture `especiais`, a sua partida contra o Bot), com a rodada e o passo de antes do toque:
  - **momento:** rodada 13, passo 51 (o Bot põe 1 K na Guarda e abre a sua janela de reação), `MEDIR_MS=1700`;
  - **cura passiva:** rodada 29, passo 137 (o golpe do Bot tira o 7♥ da sua Defesa, com 2 K e 3 Q: +28), `MEDIR_MS=2500`.
- **Cuidado:** a medição da cura pode ter pegado o começo do `sim:dificil --recomecar` da sessão do bloco E, que roda ao mesmo tempo nesta
  máquina (o aviso dela chegou depois). Se pegou, os números da cura são um piso. A do momento rodou antes.

## Números

| Passo | Tela | Quadros/s | p95 | Maior quadro | Chegada | Partículas (pico) |
|---|---|---|---|---|---|---|
| momento | PC 1366 × 768 | 54 | 33 | 100 | 100 | 0 |
| momento | 360 × 640 | 59 | 17 | 33 | 83 | 2 |
| cura passiva | PC 1366 × 768 | 51 | 33 | 100 | 100 | 0 |
| cura passiva | 360 × 640 | 56 | 33 | 83 | 83 | 0 |

**Leitura:** todos acima de 50 quadros/s. A chegada (100 ms no PC, 83 no celular) está na faixa de antes (a fatia 5 a achava de 83 a
167 ms): o momento não a piorou. O pico de partículas é a poeira do pouso do K (2 no celular; no PC o pouso cai depois da janela medida).

## O que as fotos mostram

- **O momento** (fotos aos 100, 450, 1.000, 1.450 e 1.750 ms): a carta grande no centro dos campos, a placa "BOT PÔS 1 K NA GUARDA · o K
  absorve o próximo golpe inteiro" embaixo dela, inteira nas duas telas (no celular, cobre a fileira de Ataque do Bot enquanto está no ar). O
  véu de 35% escurece a mesa durante o momento: no verde do campo dele quase não se nota, no rosa e nos botões sim. Aos 1.750 ms o K está na
  Guarda dele, com a poeira, e a faixa "Você pode reagir" desce.
- **A cura passiva** (300, 700, 1.000, 1.300 e 1.700 ms): a essência verde a caminho do seu retrato aos 1.000 ms; aos 1.300 ms, o "+28" no
  retrato, a barra enchendo de verde e os dois K da sua Guarda com o halo verde. A placa "CURA PASSIVA · a sua Defesa que cai vira vida" no
  campo. No celular, o seu campo está rolado para fora da vista no replay (o arranjo de sempre), e o "+28" aparece no retrato.
- **Não fotografado:** o voo da Armadilha até o alvo e a ida ao cemitério (o E2E confere que a camada some), e a faixa da primeira cura (o
  replay não a toca, por desenho: `firstHealSeq` é da partida ao vivo).
